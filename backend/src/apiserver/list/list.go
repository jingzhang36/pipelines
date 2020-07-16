// Copyright 2018 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Package list contains types and methods for performing ListXXX operations. In
// particular, the package exports the Options struct, which can be used for
// applying listing, filtering and pagination logic.
package list

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"reflect"
	"strings"

	sq "github.com/Masterminds/squirrel"
	"github.com/golang/glog"
	api "github.com/kubeflow/pipelines/backend/api/go_client"
	"github.com/kubeflow/pipelines/backend/src/apiserver/common"
	"github.com/kubeflow/pipelines/backend/src/apiserver/filter"
	"github.com/kubeflow/pipelines/backend/src/common/util"

	"github.com/kubeflow/pipelines/backend/src/apiserver/model"
)

// token represents a WHERE clause when making a ListXXX query. It can either
// represent a query for an initial set of results, in which page
// SortByFieldValue and KeyFieldValue are nil. If the latter fields are not nil,
// then token represents a query for a subsequent set of results (i.e., the next
// page of results), with the two values pointing to the first record in the
// next set of results.
type token struct {
	// SortByFieldName is the field name to use when sorting.
	SortByFieldName string
	// SortByFieldValue is the value of the sorted field of the next row to be
	// returned.
	SortByFieldValue interface{}
	// KeyFieldName is the name of the primary key for the model being queried.
	KeyFieldName string
	// KeyFieldValue is the value of the sorted field of the next row to be
	// returned.
	KeyFieldValue interface{}
	// IsDesc is true if the sorting order should be descending.
	IsDesc bool
	// ModelName is the table where ***FieldName belongs to.
	ModelName string
	// Filter represents the filtering that should be applied in the query.
	Filter *filter.Filter
	// SortByRunMetricName specifies a metric name to sort on. The above
	// SortByFieldName and KeyFieldName are both columns in the tables; and in
	// contrast, run metric name is not a column. Therefore, special treatment
	// is needed for sorting on run metrics and a separate member variable is
	// used to store the run metrics name that is used for sorting.
	SortByRunMetricName  string
	SortByRunMetricValue interface{}
}

func (t *token) unmarshal(pageToken string) error {
	errorF := func(err error) error {
		return util.NewInvalidInputErrorWithDetails(err, "Invalid package token.")
	}
	b, err := base64.StdEncoding.DecodeString(pageToken)
	if err != nil {
		return errorF(err)
	}

	if err = json.Unmarshal(b, t); err != nil {
		return errorF(err)
	}

	return nil
}

func (t *token) marshal() (string, error) {
	b, err := json.Marshal(t)
	if err != nil {
		return "", util.NewInternalServerError(err, "Failed to serialize page token.")
	}
	// return string(b), nil
	return base64.StdEncoding.EncodeToString(b), nil
}

// Options represents options used when making a ListXXX query. In particular,
// it contains information on how to sort and filter results. It also
// encapsulates all the logic required for making the query for an initial set
// of results as well as subsequent pages of results.
type Options struct {
	PageSize int
	*token
}

// Matches returns trues if the sorting and filtering criteria in o matches that
// of the one supplied in opts.
func (o *Options) Matches(opts *Options) bool {
	// TODO
	return o.SortByFieldName == opts.SortByFieldName &&
		o.IsDesc == opts.IsDesc &&
		reflect.DeepEqual(o.Filter, opts.Filter)
}

// NewOptionsFromToken creates a new Options struct from the passed in token
// which represents the next page of results. An empty nextPageToken will result
// in an error.
func NewOptionsFromToken(nextPageToken string, pageSize int) (*Options, error) {
	if nextPageToken == "" {
		return nil, util.NewInvalidInputError("cannot create list.Options from empty page token")
	}
	pageSize, err := validatePageSize(pageSize)
	if err != nil {
		return nil, err
	}

	t := &token{}
	if err := t.unmarshal(nextPageToken); err != nil {
		return nil, err
	}
	return &Options{PageSize: pageSize, token: t}, nil
}

// NewOptions creates a new Options struct for the given listable. It uses
// sorting and filtering criteria parsed from sortBy and filterProto
// respectively.
func NewOptions(listable Listable, pageSize int, sortBy string, filterProto *api.Filter) (*Options, error) {
	pageSize, err := validatePageSize(pageSize)
	if err != nil {
		return nil, err
	}

	token := &token{
		KeyFieldName: listable.PrimaryKeyColumnName(),
		ModelName:    listable.GetModelName()}

	// Ignore the case of the letter. Split query string by space.
	queryList := strings.Fields(strings.ToLower(sortBy))
	// Check the query string format.
	if len(queryList) > 2 || (len(queryList) == 2 && queryList[1] != "desc" && queryList[1] != "asc") {
		return nil, util.NewInvalidInputError(
			"Received invalid sort by format %q. Supported format: \"field_name\", \"field_name desc\", or \"field_name asc\"", sortBy)
	}

	token.SortByFieldName = listable.DefaultSortField()
	token.SortByRunMetricName = ""
	if len(queryList) > 0 {
		var err error
		n, ok := listable.APIToModelFieldMap()[queryList[0]]
		if ok {
			token.SortByFieldName = n
			token.SortByRunMetricName = ""
		} else if strings.HasPrefix(queryList[0], "metric:") {
			token.SortByFieldName = ""
			token.SortByRunMetricName = queryList[0][7:]
		} else {
			return nil, util.NewInvalidInputError("Invalid sorting field: %q: %s", queryList[0], err)
		}
	}

	if len(queryList) == 2 {
		token.IsDesc = queryList[1] == "desc"
	}

	// Filtering.
	if filterProto != nil {
		f, err := filter.NewWithKeyMap(filterProto, listable.APIToModelFieldMap(), listable.GetModelName())
		if err != nil {
			return nil, err
		}
		token.Filter = f
	}

	return &Options{PageSize: pageSize, token: token}, nil
}

// AddPaginationToSelect adds WHERE clauses with the sorting and pagination criteria in the
// Options o to the supplied SelectBuilder, and returns the new SelectBuilder
// containing these.
func (o *Options) AddPaginationToSelect(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	sqlBuilder = o.AddOrderBy(sqlBuilder)
	// Add one more item than what is requested.
	sqlBuilder = sqlBuilder.Limit(uint64(o.PageSize + 1))

	return sqlBuilder
}

// Add sorting based on the specified SortByFieldName or SortByRunMetricName in Options.
func (o *Options) AddOrderBy(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	// Only support sorting on one field or on one metric.
	// If SortByFieldName and SortByRunMetricName are set at the same time,
	// SortByRunMetricName prevails.
	if len(o.SortByRunMetricName) > 0 {
		return o.AddOrderByRunMetric(sqlBuilder)
	} else {
		return o.AddOrderByField(sqlBuilder)
	}
}

func (o *Options) AddOrderByField(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	// If next row's value is specified, set those values in the clause.
	var modelNamePrefix string
	if len(o.ModelName) == 0 {
		modelNamePrefix = ""
	} else {
		modelNamePrefix = o.ModelName + "."
	}
	if o.SortByFieldValue != nil && o.KeyFieldValue != nil {
		if o.IsDesc {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Lt{modelNamePrefix + o.SortByFieldName: o.SortByFieldValue},
					sq.And{sq.Eq{modelNamePrefix + o.SortByFieldName: o.SortByFieldValue},
						sq.LtOrEq{modelNamePrefix + o.KeyFieldName: o.KeyFieldValue}}})
		} else {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Gt{modelNamePrefix + o.SortByFieldName: o.SortByFieldValue},
					sq.And{sq.Eq{modelNamePrefix + o.SortByFieldName: o.SortByFieldValue},
						sq.GtOrEq{modelNamePrefix + o.KeyFieldName: o.KeyFieldValue}}})
		}
	}

	order := "ASC"
	if o.IsDesc {
		order = "DESC"
	}
	sqlBuilder = sqlBuilder.
		OrderBy(fmt.Sprintf("%v %v", modelNamePrefix+o.SortByFieldName, order)).
		OrderBy(fmt.Sprintf("%v %v", modelNamePrefix+o.KeyFieldName, order))

	return sqlBuilder
}

func (o *Options) AddOrderByRunMetric(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	if len(o.SortByRunMetricName) == 0 {
		return sqlBuilder
	}

	// If not the first page nad next row's value is specified, set those values in where clause.
	var modelNamePrefix string
	if len(o.ModelName) == 0 {
		modelNamePrefix = ""
	} else {
		modelNamePrefix = o.ModelName + "."
	}
	if o.SortByRunMetricValue != nil {
		if o.IsDesc {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Lt{o.SortByRunMetricName: o.SortByRunMetricValue},
					sq.And{sq.Eq{o.SortByRunMetricName: o.SortByRunMetricValue},
						sq.LtOrEq{modelNamePrefix + o.KeyFieldName: o.KeyFieldValue}}})
		} else {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Gt{o.SortByRunMetricName: o.SortByRunMetricValue},
					sq.And{sq.Eq{o.SortByRunMetricName: o.SortByRunMetricValue},
						sq.GtOrEq{modelNamePrefix + o.KeyFieldName: o.KeyFieldValue}}})
		}
	}

	order := "ASC"
	if o.IsDesc {
		order = "DESC"
	}
	sqlBuilder = sqlBuilder.
		OrderBy(fmt.Sprintf("%v %v", o.SortByRunMetricName, order))

	return sqlBuilder
}

// Add the metric as a new field to the select clause by join the passed-in SQL query with run_metrics table.
// With the metric as a field in the select clause enable sorting on this metric afterwards.
func (o *Options) AddSortByRunMetricToSelect(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	if len(o.SortByRunMetricName) == 0 {
		return sqlBuilder
	}
	return sq.
		Select("selected_runs.*, run_metrics.numbervalue as "+o.SortByRunMetricName).
		FromSelect(sqlBuilder, "selected_runs").
		LeftJoin("run_metrics ON selected_runs.uuid=run_metrics.runuuid AND run_metrics.name='" + o.SortByRunMetricName + "'")
}

// AddFilterToSelect adds WHERE clauses with the filtering criteria in the
// Options o to the supplied SelectBuilder, and returns the new SelectBuilder
// containing these.
func (o *Options) AddFilterToSelect(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	if o.Filter != nil {
		sqlBuilder = o.Filter.AddToSelect(sqlBuilder)
	}

	return sqlBuilder
}

// FilterOnResourceReference filters the given resource's table by rows from the ResourceReferences
// table that match an optional given filter, and returns the rebuilt SelectBuilder
func FilterOnResourceReference(tableName string, columns []string, resourceType common.ResourceType,
	selectCount bool, filterContext *common.FilterContext) (sq.SelectBuilder, error) {
	selectBuilder := sq.Select(columns...)
	if selectCount {
		selectBuilder = sq.Select("count(*)")
	}
	selectBuilder = selectBuilder.From(tableName)
	if filterContext.ReferenceKey != nil {
		resourceReferenceFilter, args, err := sq.Select("ResourceUUID").
			From("resource_references as rf").
			Where(sq.And{
				sq.Eq{"rf.ResourceType": resourceType},
				sq.Eq{"rf.ReferenceUUID": filterContext.ID},
				sq.Eq{"rf.ReferenceType": filterContext.Type}}).ToSql()
		if err != nil {
			return selectBuilder, util.NewInternalServerError(
				err, "Failed to create subquery to filter by resource reference: %v", err.Error())
		}
		return selectBuilder.Where(fmt.Sprintf("UUID in (%s)", resourceReferenceFilter), args...), nil
	}
	return selectBuilder, nil
}

// FilterOnExperiment filters the given table by rows based on provided experiment ID,
// and returns the rebuilt SelectBuilder
func FilterOnExperiment(
	tableName string,
	columns []string,
	selectCount bool,
	experimentID string,
) (sq.SelectBuilder, error) {
	return filterByColumnValue(tableName, columns, selectCount, "ExperimentUUID", experimentID), nil
}

func FilterOnNamespace(
	tableName string,
	columns []string,
	selectCount bool,
	namespace string,
) (sq.SelectBuilder, error) {
	return filterByColumnValue(tableName, columns, selectCount, "Namespace", namespace), nil
}

func filterByColumnValue(
	tableName string,
	columns []string,
	selectCount bool,
	columnName string,
	filterValue interface{},
) sq.SelectBuilder {
	selectBuilder := sq.Select(columns...)
	if selectCount {
		selectBuilder = sq.Select("count(*)")
	}
	selectBuilder = selectBuilder.From(tableName).Where(
		sq.Eq{columnName: filterValue},
	)
	return selectBuilder
}

// Scans the one given row into a number, and returns the number
func ScanRowToTotalSize(rows *sql.Rows) (int, error) {
	var total_size int
	rows.Next()
	err := rows.Scan(&total_size)
	if err != nil {
		return 0, util.NewInternalServerError(err, "Failed to scan row total_size")
	}
	return total_size, nil
}

// Listable is an interface that should be implemented by any resource/model
// that wants to support listing queries.
type Listable interface {
	// PrimaryKeyColumnName returns the primary key for model.
	PrimaryKeyColumnName() string
	// DefaultSortField returns the default field name to be used when sorting list
	// query results.
	DefaultSortField() string
	// APIToModelFieldMap returns a map from field names in the API representation
	// of the model to its corresponding field name in the model itself.
	APIToModelFieldMap() map[string]string
	// GetModelName returns table name used as sort field prefix.
	GetModelName() string
}

// NextPageToken returns a string that can be used to fetch the subsequent set
// of results using the same listing options in o, starting with listable as the
// first record.
func (o *Options) NextPageToken(listable Listable) (string, error) {
	t, err := o.nextPageToken(listable)
	if err != nil {
		return "", err
	}
	return t.marshal()
}

func (o *Options) nextPageToken(listable Listable) (*token, error) {
	// TODO
	elem := reflect.ValueOf(listable).Elem()
	glog.Infof("next page token: elem: %+v\n", elem)
	elemName := elem.Type().Name()
	glog.Infof("next page token: elem name: %+v\n", elemName)

	sortByField := elem.FieldByName(o.SortByFieldName)
	glog.Infof("next page token: sort field: %+v for %+v\n", sortByField, elem.FieldByName)
	if !sortByField.IsValid() {
		return nil, util.NewInvalidInputError("cannot sort by field %q on type %q", o.SortByFieldName, elemName)
	}

	keyField := elem.FieldByName(listable.PrimaryKeyColumnName())
	glog.Infof("next page token: key field: %+v for %+v\n", keyField, listable.PrimaryKeyColumnName)
	if !keyField.IsValid() {
		return nil, util.NewInvalidInputError("type %q does not have key field %q", elemName, o.KeyFieldName)
	}

	var runMetricFieldValue interface{}
	if elemName == "Run" && len(o.SortByRunMetricName) > 0 {
		runMetrics := elem.FieldByName("Metrics")
		if !runMetrics.IsValid() {
			return nil, util.NewInvalidInputError("Unable to find run metrics")
		}
		metrics, ok := runMetrics.Interface().([]*model.RunMetric)
		if !ok {
			return nil, util.NewInvalidInputError("Unable to parse run metrics")
		}
		// Find the metric inside metrics that matches the o.SortByRunMetricName
		found := false
		for _, metric := range metrics {
			if metric.Name == o.SortByRunMetricName {
				runMetricFieldValue = metric.NumberValue
				found = true
				glog.Infof("run metric sorting: %+v %+v\n", o.SortByRunMetricName, runMetricFieldValue)
			}
		}
		if !found {
			return nil, util.NewInvalidInputError("Unable to find run metric %s", o.SortByRunMetricName)
		}
	}

	return &token{
		SortByFieldName:      o.SortByFieldName,
		SortByFieldValue:     sortByField.Interface(),
		KeyFieldName:         listable.PrimaryKeyColumnName(),
		KeyFieldValue:        keyField.Interface(),
		IsDesc:               o.IsDesc,
		Filter:               o.Filter,
		ModelName:            o.ModelName,
		SortByRunMetricName:  o.SortByRunMetricName,
		SortByRunMetricValue: runMetricFieldValue,
	}, nil
}

const (
	defaultPageSize = 20
	maxPageSize     = 200
)

func validatePageSize(pageSize int) (int, error) {
	if pageSize < 0 {
		return 0, util.NewInvalidInputError("The page size should be greater than 0. Got %q", pageSize)
	}

	if pageSize == 0 {
		// Use default page size if not provided.
		return defaultPageSize, nil
	}

	if pageSize > maxPageSize {
		return maxPageSize, nil
	}

	return pageSize, nil
}

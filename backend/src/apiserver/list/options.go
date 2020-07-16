package list

import (
	"fmt"
	"reflect"
	"strings"

	sq "github.com/Masterminds/squirrel"
	api "github.com/kubeflow/pipelines/backend/api/go_client"
	"github.com/kubeflow/pipelines/backend/src/apiserver/filter"
	"github.com/kubeflow/pipelines/backend/src/apiserver/model"
	"github.com/kubeflow/pipelines/backend/src/common/util"
)

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
	return o.SortByFieldName == opts.SortByFieldName && o.SortByFieldIsRunMetric == opts.SortByFieldIsRunMetric &&
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
	token.SortByFieldIsRunMetric = false
	if len(queryList) > 0 {
		var err error
		n, ok := listable.APIToModelFieldMap()[queryList[0]]
		if ok {
			token.SortByFieldName = n
		} else if strings.HasPrefix(queryList[0], "metric:") {
			// Sorting on metrics is only available on runs.
			model := reflect.ValueOf(listable).Elem().Type().Name()
			if model != "Run" {
				return nil, util.NewInvalidInputError("Invalid sorting field: %q on %q : %s", queryList[0], model, err)
			}
			token.SortByFieldName = queryList[0][7:]
			token.SortByFieldIsRunMetric = true
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

func (o *Options) AddOrderBy(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	// If next row's value is specified, set those values in the clause.
	var keyFieldPrefix string
	var sortByFieldPrefix string
	if len(o.ModelName) == 0 {
		keyFieldPrefix = ""
		sortByFieldPrefix = ""
	} else if o.SortByFieldIsRunMetric {
		keyFieldPrefix = o.ModelName + "."
		sortByFieldPrefix = ""
	} else {
		keyFieldPrefix = o.ModelName + "."
		sortByFieldPrefix = o.ModelName + "."
	}
	if o.SortByFieldValue != nil && o.KeyFieldValue != nil {
		if o.IsDesc {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Lt{sortByFieldPrefix + o.SortByFieldName: o.SortByFieldValue},
					sq.And{sq.Eq{sortByFieldPrefix + o.SortByFieldName: o.SortByFieldValue},
						sq.LtOrEq{keyFieldPrefix + o.KeyFieldName: o.KeyFieldValue}}})
		} else {
			sqlBuilder = sqlBuilder.
				Where(sq.Or{sq.Gt{sortByFieldPrefix + o.SortByFieldName: o.SortByFieldValue},
					sq.And{sq.Eq{sortByFieldPrefix + o.SortByFieldName: o.SortByFieldValue},
						sq.GtOrEq{keyFieldPrefix + o.KeyFieldName: o.KeyFieldValue}}})
		}
	}

	order := "ASC"
	if o.IsDesc {
		order = "DESC"
	}
	sqlBuilder = sqlBuilder.
		OrderBy(fmt.Sprintf("%v %v", sortByFieldPrefix+o.SortByFieldName, order)).
		OrderBy(fmt.Sprintf("%v %v", keyFieldPrefix+o.KeyFieldName, order))

	return sqlBuilder
}

// Add the metric as a new field to the select clause by join the passed-in SQL query with run_metrics table.
// With the metric as a field in the select clause enable sorting on this metric afterwards.
func (o *Options) AddSortByRunMetricToSelect(sqlBuilder sq.SelectBuilder) sq.SelectBuilder {
	if !o.SortByFieldIsRunMetric {
		return sqlBuilder
	}
	return sq.
		Select("selected_runs.*, run_metrics.numbervalue as "+o.SortByFieldName).
		FromSelect(sqlBuilder, "selected_runs").
		LeftJoin("run_metrics ON selected_runs.uuid=run_metrics.runuuid AND run_metrics.name='" + o.SortByFieldName + "'")
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
	elem := reflect.ValueOf(listable).Elem()
	elemName := elem.Type().Name()

	var sortByField interface{}
	if !o.SortByFieldIsRunMetric {
		if value := elem.FieldByName(o.SortByFieldName); value.IsValid() {
			sortByField = value.Interface()
		} else {
			return nil, util.NewInvalidInputError("cannot sort by field %q on type %q", o.SortByFieldName, elemName)
		}
	} else {
		// Sort by run metrics
		runMetrics := elem.FieldByName("Metrics")
		if !runMetrics.IsValid() {
			return nil, util.NewInvalidInputError("Unable to find run metrics")
		}
		metrics, ok := runMetrics.Interface().([]*model.RunMetric)
		if !ok {
			return nil, util.NewInvalidInputError("Unable to parse run metrics")
		}
		// Find the metric inside metrics that matches the o.SortByFieldName
		found := false
		for _, metric := range metrics {
			if metric.Name == o.SortByFieldName {
				sortByField = metric.NumberValue
				found = true
			}
		}
		if !found {
			return nil, util.NewInvalidInputError("Unable to find run metric %s", o.SortByFieldName)
		}
	}

	keyField := elem.FieldByName(listable.PrimaryKeyColumnName())
	if !keyField.IsValid() {
		return nil, util.NewInvalidInputError("type %q does not have key field %q", elemName, o.KeyFieldName)
	}

	return &token{
		SortByFieldName:        o.SortByFieldName,
		SortByFieldValue:       sortByField,
		SortByFieldIsRunMetric: o.SortByFieldIsRunMetric,
		KeyFieldName:           listable.PrimaryKeyColumnName(),
		KeyFieldValue:          keyField.Interface(),
		IsDesc:                 o.IsDesc,
		Filter:                 o.Filter,
		ModelName:              o.ModelName,
	}, nil
}

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

	sq "github.com/Masterminds/squirrel"
	"github.com/kubeflow/pipelines/backend/src/apiserver/common"
	"github.com/kubeflow/pipelines/backend/src/apiserver/filter"
	"github.com/kubeflow/pipelines/backend/src/common/util"
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
	SortByFieldValue       interface{}
	SortByFieldIsRunMetric bool

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

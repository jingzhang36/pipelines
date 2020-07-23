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

// Package list contains types and methods for performing ListXXX operations on
// models like model.Run, model.Job, model.Experiment, model.Pipeline, model.PipelineVersion.
// TODO(jingzhang36): also seems ok if merge this package to package model.
package list

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
	// Get the prefix of sorting field.
	GetSortByFieldPrefix(string) string
	// Get the prefix of key field.
	GetKeyFieldPrefix() string
	// Get a valid field for sorting/filter in a listable object from the given string.
	GetField(name string) (string, bool)
	// Find the value of a given field in a listable object.
	GetFieldValue(name string) interface{}
}

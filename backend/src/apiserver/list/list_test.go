package list

import (
	"testing"

	"github.com/kubeflow/pipelines/backend/src/apiserver/common"
	"github.com/kubeflow/pipelines/backend/src/apiserver/filter"
	"github.com/kubeflow/pipelines/backend/src/common/util"
	"github.com/stretchr/testify/assert"

	"github.com/google/go-cmp/cmp"
	"github.com/google/go-cmp/cmp/cmpopts"
	api "github.com/kubeflow/pipelines/backend/api/go_client"
)

type fakeListable struct {
	PrimaryKey       string
	FakeName         string
	CreatedTimestamp int64
}

func (f *fakeListable) PrimaryKeyColumnName() string {
	return "PrimaryKey"
}

func (f *fakeListable) DefaultSortField() string {
	return "CreatedTimestamp"
}

var fakeAPIToModelMap = map[string]string{
	"timestamp": "CreatedTimestamp",
	"name":      "FakeName",
	"id":        "PrimaryKey",
}

func (f *fakeListable) APIToModelFieldMap() map[string]string {
	return fakeAPIToModelMap
}

func (f *fakeListable) GetModelName() string {
	return ""
}

func TestNextPageToken_ValidTokens(t *testing.T) {
	l := &fakeListable{PrimaryKey: "uuid123", FakeName: "Fake", CreatedTimestamp: 1234}

	protoFilter := &api.Filter{Predicates: []*api.Predicate{
		&api.Predicate{
			Key:   "name",
			Op:    api.Predicate_EQUALS,
			Value: &api.Predicate_StringValue{StringValue: "SomeName"},
		}}}
	testFilter, err := filter.New(protoFilter)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter, err)
	}

	tests := []struct {
		inOpts *Options
		want   *token
	}{
		{
			inOpts: &Options{
				PageSize: 10, token: &token{SortByFieldName: "CreatedTimestamp", IsDesc: true},
			},
			want: &token{
				SortByFieldName:  "CreatedTimestamp",
				SortByFieldValue: int64(1234),
				KeyFieldName:     "PrimaryKey",
				KeyFieldValue:    "uuid123",
				IsDesc:           true,
			},
		},
		{
			inOpts: &Options{
				PageSize: 10, token: &token{SortByFieldName: "PrimaryKey", IsDesc: true},
			},
			want: &token{
				SortByFieldName:  "PrimaryKey",
				SortByFieldValue: "uuid123",
				KeyFieldName:     "PrimaryKey",
				KeyFieldValue:    "uuid123",
				IsDesc:           true,
			},
		},
		{
			inOpts: &Options{
				PageSize: 10, token: &token{SortByFieldName: "FakeName", IsDesc: false},
			},
			want: &token{
				SortByFieldName:  "FakeName",
				SortByFieldValue: "Fake",
				KeyFieldName:     "PrimaryKey",
				KeyFieldValue:    "uuid123",
				IsDesc:           false,
			},
		},
		{
			inOpts: &Options{
				PageSize: 10,
				token: &token{
					SortByFieldName: "FakeName", IsDesc: false,
					Filter: testFilter,
				},
			},
			want: &token{
				SortByFieldName:  "FakeName",
				SortByFieldValue: "Fake",
				KeyFieldName:     "PrimaryKey",
				KeyFieldValue:    "uuid123",
				IsDesc:           false,
				Filter:           testFilter,
			},
		},
	}

	for _, test := range tests {
		got, err := test.inOpts.nextPageToken(l)

		if !cmp.Equal(got, test.want, cmp.AllowUnexported(filter.Filter{})) || err != nil {
			t.Errorf("nextPageToken(%+v, %+v) =\nGot: %+v, %+v\nWant: %+v, <nil>\nDiff:\n%s",
				test.inOpts, l, got, err, test.want, cmp.Diff(test.want, got))
		}
	}
}

func TestNextPageToken_InvalidSortByField(t *testing.T) {
	l := &fakeListable{PrimaryKey: "uuid123", FakeName: "Fake", CreatedTimestamp: 1234}

	inOpts := &Options{
		PageSize: 10, token: &token{SortByFieldName: "Timestamp", IsDesc: true},
	}
	want := util.NewInvalidInputError(`cannot sort by field "Timestamp" on type "fakeListable"`)

	got, err := inOpts.nextPageToken(l)

	if !cmp.Equal(err, want, cmpopts.IgnoreUnexported(util.UserError{})) {
		t.Errorf("nextPageToken(%+v, %+v) =\nGot: %+v, %v\nWant: _, %v",
			inOpts, l, got, err, want)
	}
}

func TestValidatePageSize(t *testing.T) {
	tests := []struct {
		in   int
		want int
	}{
		{0, defaultPageSize},
		{100, 100},
		{200, 200},
		{300, maxPageSize},
	}

	for _, test := range tests {
		got, err := validatePageSize(test.in)

		if got != test.want || err != nil {
			t.Errorf("validatePageSize(%d) = %d, %v\nWant: %d, <nil>", test.in, got, err, test.want)
		}
	}

	got, err := validatePageSize(-1)
	if err == nil {
		t.Errorf("validatePageSize(-1) = %d, <nil>\nWant: _, error", got)
	}
}

func TestTokenSerialization(t *testing.T) {
	protoFilter := &api.Filter{Predicates: []*api.Predicate{
		&api.Predicate{
			Key:   "name",
			Op:    api.Predicate_EQUALS,
			Value: &api.Predicate_StringValue{StringValue: "SomeName"},
		}}}
	testFilter, err := filter.New(protoFilter)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter, err)
	}

	tests := []struct {
		in   *token
		want *token
	}{
		// string values in sort by fields
		{
			in: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: "string_field_value",
				KeyFieldName:     "KeyField",
				KeyFieldValue:    "string_key_value",
				IsDesc:           true},
			want: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: "string_field_value",
				KeyFieldName:     "KeyField",
				KeyFieldValue:    "string_key_value",
				IsDesc:           true},
		},
		// int values get deserialized as floats by JSON unmarshal.
		{
			in: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: 100,
				KeyFieldName:     "KeyField",
				KeyFieldValue:    200,
				IsDesc:           true},
			want: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: float64(100),
				KeyFieldName:     "KeyField",
				KeyFieldValue:    float64(200),
				IsDesc:           true},
		},
		// has a filter.
		{
			in: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: 100,
				KeyFieldName:     "KeyField",
				KeyFieldValue:    200,
				IsDesc:           true,
				Filter:           testFilter,
			},
			want: &token{
				SortByFieldName:  "SortField",
				SortByFieldValue: float64(100),
				KeyFieldName:     "KeyField",
				KeyFieldValue:    float64(200),
				IsDesc:           true,
				Filter:           testFilter,
			},
		},
	}

	for _, test := range tests {
		s, err := test.in.marshal()

		if err != nil {
			t.Errorf("Token.Marshal(%+v) = _, %v\nWant nil error", test.in, err)
			continue
		}

		got := &token{}
		got.unmarshal(s)
		if !cmp.Equal(got, test.want, cmp.AllowUnexported(filter.Filter{})) {
			t.Errorf("token.unmarshal(%q) =\nGot: %+v\nWant: %+v\nDiff:\n%s",
				s, got, test.want, cmp.Diff(test.want, got, cmp.AllowUnexported(filter.Filter{})))
		}
	}
}

func TestFilterMatches(t *testing.T) {
	protoFilter1 := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "Name",
				Op:    api.Predicate_EQUALS,
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}
	f1, err := filter.New(protoFilter1)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter1, err)
	}

	protoFilter2 := &api.Filter{
		Predicates: []*api.Predicate{
			&api.Predicate{
				Key:   "Name",
				Op:    api.Predicate_NOT_EQUALS, // Not equals as opposed to equals above.
				Value: &api.Predicate_StringValue{StringValue: "SomeName"},
			},
		},
	}
	f2, err := filter.New(protoFilter2)
	if err != nil {
		t.Fatalf("failed to parse filter proto %+v: %v", protoFilter2, err)
	}
}

func TestFilterOnResourceReference(t *testing.T) {

	type testIn struct {
		table        string
		resourceType common.ResourceType
		count        bool
		filter       *common.FilterContext
	}
	tests := []struct {
		in      *testIn
		wantSql string
		wantErr error
	}{
		{
			in: &testIn{
				table:        "testTable",
				resourceType: common.Run,
				count:        false,
				filter:       &common.FilterContext{},
			},
			wantSql: "SELECT * FROM testTable",
			wantErr: nil,
		},
		{
			in: &testIn{
				table:        "testTable",
				resourceType: common.Run,
				count:        true,
				filter:       &common.FilterContext{},
			},
			wantSql: "SELECT count(*) FROM testTable",
			wantErr: nil,
		},
		{
			in: &testIn{
				table:        "testTable",
				resourceType: common.Run,
				count:        false,
				filter:       &common.FilterContext{ReferenceKey: &common.ReferenceKey{Type: common.Run}},
			},
			wantSql: "SELECT * FROM testTable WHERE UUID in (SELECT ResourceUUID FROM resource_references as rf WHERE (rf.ResourceType = ? AND rf.ReferenceUUID = ? AND rf.ReferenceType = ?))",
			wantErr: nil,
		},
		{
			in: &testIn{
				table:        "testTable",
				resourceType: common.Run,
				count:        true,
				filter:       &common.FilterContext{ReferenceKey: &common.ReferenceKey{Type: common.Run}},
			},
			wantSql: "SELECT count(*) FROM testTable WHERE UUID in (SELECT ResourceUUID FROM resource_references as rf WHERE (rf.ResourceType = ? AND rf.ReferenceUUID = ? AND rf.ReferenceType = ?))",
			wantErr: nil,
		},
	}

	for _, test := range tests {
		sqlBuilder, gotErr := FilterOnResourceReference(test.in.table, []string{"*"}, test.in.resourceType, test.in.count, test.in.filter)
		gotSql, _, err := sqlBuilder.ToSql()
		assert.Nil(t, err)

		if gotSql != test.wantSql || gotErr != test.wantErr {
			t.Errorf("FilterOnResourceReference(%+v) =\nGot: %q, %v\nWant: %q, %v",
				test.in, gotSql, gotErr, test.wantSql, test.wantErr)
		}
	}
}

func TestFilterOnExperiment(t *testing.T) {

	type testIn struct {
		table  string
		count  bool
		filter *common.FilterContext
	}
	tests := []struct {
		in      *testIn
		wantSql string
		wantErr error
	}{
		{
			in: &testIn{
				table:  "testTable",
				count:  false,
				filter: &common.FilterContext{},
			},
			wantSql: "SELECT * FROM testTable WHERE ExperimentUUID = ?",
			wantErr: nil,
		},
		{
			in: &testIn{
				table:  "testTable",
				count:  true,
				filter: &common.FilterContext{},
			},
			wantSql: "SELECT count(*) FROM testTable WHERE ExperimentUUID = ?",
			wantErr: nil,
		},
	}

	for _, test := range tests {
		sqlBuilder, gotErr := FilterOnExperiment(test.in.table, []string{"*"}, test.in.count, "123")
		gotSql, _, err := sqlBuilder.ToSql()
		assert.Nil(t, err)

		if gotSql != test.wantSql || gotErr != test.wantErr {
			t.Errorf("FilterOnExperiment(%+v) =\nGot: %q, %v\nWant: %q, %v",
				test.in, gotSql, gotErr, test.wantSql, test.wantErr)
		}
	}
}

func TestFilterOnNamesapce(t *testing.T) {

	type testIn struct {
		table  string
		count  bool
		filter *common.FilterContext
	}
	tests := []struct {
		in      *testIn
		wantSql string
		wantErr error
	}{
		{
			in: &testIn{
				table:  "testTable",
				count:  false,
				filter: &common.FilterContext{},
			},
			wantSql: "SELECT * FROM testTable WHERE Namespace = ?",
			wantErr: nil,
		},
		{
			in: &testIn{
				table:  "testTable",
				count:  true,
				filter: &common.FilterContext{},
			},
			wantSql: "SELECT count(*) FROM testTable WHERE Namespace = ?",
			wantErr: nil,
		},
	}

	for _, test := range tests {
		sqlBuilder, gotErr := FilterOnNamespace(test.in.table, []string{"*"}, test.in.count, "ns")
		gotSql, _, err := sqlBuilder.ToSql()
		assert.Nil(t, err)

		if gotSql != test.wantSql || gotErr != test.wantErr {
			t.Errorf("FilterOnNamespace(%+v) =\nGot: %q, %v\nWant: %q, %v",
				test.in, gotSql, gotErr, test.wantSql, test.wantErr)
		}
	}
}

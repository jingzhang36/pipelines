// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package common

import (
	"github.com/kubeflow/pipelines/backend/src/apiserver/resource"
	"github.com/kubeflow/pipelines/backend/src/common/util"
)

// Verify pipeline version in resource references as creator.
func VerifyPipelineVersionReferenceAsCreator(resourceManager *resource.ResourceManager, references []*api.ResourceReference) (*string, error) {
	if references == nil {
		return nil, util.NewInvalidInputError(
			"Please specify a pipeline version in Run's resource references")
	}

	for _, reference := range references {
		if reference.Key.Type == api.ResourceType_PIPELINE_VERSION &&
			reference.Relationship == api.Relationship_CREATOR {
			return resourceReference.Key.Id, nil
		}
	}

	return nil, util.NewInvalidInputError(
		"Please specify a pipeline version in Run's resource references")
}

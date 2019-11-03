#!/bin/bash

# create version
data='{"name":'\""ci-$1"\"', "code_source_url": "https://github.com/kubeflow/pipelines/tree/'"$1"'", "package_url": {"pipeline_url": "https://storage.googleapis.com/jingzhangjz-kfp/'"$1"'/pipeline.zip"}, "resource_references": [{"key": {"id": '\""$2"\"', "type":3}, "relationship":1}]}'
version=$(curl -H "Content-Type: application/json" -X POST -d "$data" http://34.66.193.222:8888/apis/v1beta1/pipeline_versions | jq -r ".id")
echo "$version"

# create run
rundata='{"name":'\""$1-run"\"', "resource_references": [{"key": {"id": '\""$version"\"', "type":4}, "relationship":2}, {"key": {"id": '\""$3"\"', "type":1}, "relationship": 1}]}'
echo "$rundata"
curl -H "Content-Type: application/json" -X POST -d "$rundata" http://34.66.193.222:8888/apis/v1beta1/runs
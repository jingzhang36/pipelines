/// <reference path="./custom.d.ts" />
// tslint:disable
/**
 * backend/api/job.proto
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: version not set
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */


import * as url from "url";
import * as portableFetch from "portable-fetch";
import { Configuration } from "./configuration";

const BASE_PATH = "http://localhost".replace(/\/+$/, "");

/**
 *
 * @export
 */
export const COLLECTION_FORMATS = {
    csv: ",",
    ssv: " ",
    tsv: "\t",
    pipes: "|",
};

/**
 *
 * @export
 * @interface FetchAPI
 */
export interface FetchAPI {
    (url: string, init?: any): Promise<Response>;
}

/**
 *  
 * @export
 * @interface FetchArgs
 */
export interface FetchArgs {
    url: string;
    options: any;
}

/**
 * 
 * @export
 * @class BaseAPI
 */
export class BaseAPI {
    protected configuration: Configuration;

    constructor(configuration?: Configuration, protected basePath: string = BASE_PATH, protected fetch: FetchAPI = portableFetch) {
        if (configuration) {
            this.configuration = configuration;
            this.basePath = configuration.basePath || this.basePath;
        }
    }
};

/**
 * 
 * @export
 * @class RequiredError
 * @extends {Error}
 */
export class RequiredError extends Error {
    name: "RequiredError"
    constructor(public field: string, msg?: string) {
        super(msg);
    }
}

/**
 * 
 * @export
 * @interface ApiCronSchedule
 */
export interface ApiCronSchedule {
    /**
     * 
     * @type {Date}
     * @memberof ApiCronSchedule
     */
    start_time?: Date;
    /**
     * 
     * @type {Date}
     * @memberof ApiCronSchedule
     */
    end_time?: Date;
    /**
     * 
     * @type {string}
     * @memberof ApiCronSchedule
     */
    cron?: string;
}

/**
 * 
 * @export
 * @interface ApiJob
 */
export interface ApiJob {
    /**
     * Output. Unique run ID. Generated by API server.
     * @type {string}
     * @memberof ApiJob
     */
    id?: string;
    /**
     * Required input field. Job name provided by user. Not unique.
     * @type {string}
     * @memberof ApiJob
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof ApiJob
     */
    description?: string;
    /**
     * Required input field. Describing what the pipeline manifest and parameters to use for the scheduled job.
     * @type {ApiPipelineSpec}
     * @memberof ApiJob
     */
    pipeline_spec?: ApiPipelineSpec;
    /**
     * Optional input field. Specify which resource this run belongs to.
     * @type {Array<ApiResourceReference>}
     * @memberof ApiJob
     */
    resource_references?: Array<ApiResourceReference>;
    /**
     * 
     * @type {string}
     * @memberof ApiJob
     */
    max_concurrency?: string;
    /**
     * Required input field. Specify how a run is triggered. Support cron mode or periodic mode.
     * @type {ApiTrigger}
     * @memberof ApiJob
     */
    trigger?: ApiTrigger;
    /**
     * 
     * @type {JobMode}
     * @memberof ApiJob
     */
    mode?: JobMode;
    /**
     * Output. The time this job is created.
     * @type {Date}
     * @memberof ApiJob
     */
    created_at?: Date;
    /**
     * Output. The last time this job is updated.
     * @type {Date}
     * @memberof ApiJob
     */
    updated_at?: Date;
    /**
     * 
     * @type {string}
     * @memberof ApiJob
     */
    status?: string;
    /**
     * In case any error happens retrieving a job field, only job ID and the error message is returned. Client has the flexibility of choosing how to handle error. This is especially useful during listing call.
     * @type {string}
     * @memberof ApiJob
     */
    error?: string;
    /**
     * Input. Whether the job is enabled or not.
     * @type {boolean}
     * @memberof ApiJob
     */
    enabled?: boolean;
}

/**
 * 
 * @export
 * @interface ApiListJobsResponse
 */
export interface ApiListJobsResponse {
    /**
     * A list of jobs returned.
     * @type {Array<ApiJob>}
     * @memberof ApiListJobsResponse
     */
    jobs?: Array<ApiJob>;
    /**
     * 
     * @type {number}
     * @memberof ApiListJobsResponse
     */
    total_size?: number;
    /**
     * 
     * @type {string}
     * @memberof ApiListJobsResponse
     */
    next_page_token?: string;
}

/**
 * 
 * @export
 * @interface ApiParameter
 */
export interface ApiParameter {
    /**
     * 
     * @type {string}
     * @memberof ApiParameter
     */
    name?: string;
    /**
     * 
     * @type {string}
     * @memberof ApiParameter
     */
    value?: string;
}

/**
 * 
 * @export
 * @interface ApiPeriodicSchedule
 */
export interface ApiPeriodicSchedule {
    /**
     * 
     * @type {Date}
     * @memberof ApiPeriodicSchedule
     */
    start_time?: Date;
    /**
     * 
     * @type {Date}
     * @memberof ApiPeriodicSchedule
     */
    end_time?: Date;
    /**
     * 
     * @type {string}
     * @memberof ApiPeriodicSchedule
     */
    interval_second?: string;
}

/**
 * 
 * @export
 * @interface ApiPipelineSpec
 */
export interface ApiPipelineSpec {
    /**
     * Optional input field. The ID of the pipeline user uploaded before.
     * @type {string}
     * @memberof ApiPipelineSpec
     */
    pipeline_id?: string;
    /**
     * Optional output field. The name of the pipeline. Not empty if the pipeline id is not empty.
     * @type {string}
     * @memberof ApiPipelineSpec
     */
    pipeline_name?: string;
    /**
     * Optional input field. The marshalled raw argo JSON workflow. This will be deprecated when pipeline_manifest is in use.
     * @type {string}
     * @memberof ApiPipelineSpec
     */
    workflow_manifest?: string;
    /**
     * Optional input field. The raw pipeline JSON spec.
     * @type {string}
     * @memberof ApiPipelineSpec
     */
    pipeline_manifest?: string;
    /**
     * The parameter user provide to inject to the pipeline JSON. If a default value of a parameter exist in the JSON, the value user provided here will replace.
     * @type {Array<ApiParameter>}
     * @memberof ApiPipelineSpec
     */
    parameters?: Array<ApiParameter>;
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum ApiRelationship {
    UNKNOWNRELATIONSHIP = <any> 'UNKNOWN_RELATIONSHIP',
    OWNER = <any> 'OWNER',
    CREATOR = <any> 'CREATOR'
}

/**
 * 
 * @export
 * @interface ApiResourceKey
 */
export interface ApiResourceKey {
    /**
     * The type of the resource that referred to.
     * @type {ApiResourceType}
     * @memberof ApiResourceKey
     */
    type?: ApiResourceType;
    /**
     * The ID of the resource that referred to.
     * @type {string}
     * @memberof ApiResourceKey
     */
    id?: string;
}

/**
 * 
 * @export
 * @interface ApiResourceReference
 */
export interface ApiResourceReference {
    /**
     * 
     * @type {ApiResourceKey}
     * @memberof ApiResourceReference
     */
    key?: ApiResourceKey;
    /**
     * The name of the resource that referred to.
     * @type {string}
     * @memberof ApiResourceReference
     */
    name?: string;
    /**
     * Required field. The relationship from referred resource to the object.
     * @type {ApiRelationship}
     * @memberof ApiResourceReference
     */
    relationship?: ApiRelationship;
}

/**
 * 
 * @export
 * @enum {string}
 */
export enum ApiResourceType {
    UNKNOWNRESOURCETYPE = <any> 'UNKNOWN_RESOURCE_TYPE',
    EXPERIMENT = <any> 'EXPERIMENT',
    JOB = <any> 'JOB',
    PIPELINE = <any> 'PIPELINE',
    PIPELINEVERSION = <any> 'PIPELINE_VERSION'
}

/**
 * 
 * @export
 * @interface ApiStatus
 */
export interface ApiStatus {
    /**
     * 
     * @type {string}
     * @memberof ApiStatus
     */
    error?: string;
    /**
     * 
     * @type {number}
     * @memberof ApiStatus
     */
    code?: number;
    /**
     * 
     * @type {Array<ProtobufAny>}
     * @memberof ApiStatus
     */
    details?: Array<ProtobufAny>;
}

/**
 * Trigger defines what starts a pipeline run.
 * @export
 * @interface ApiTrigger
 */
export interface ApiTrigger {
    /**
     * 
     * @type {ApiCronSchedule}
     * @memberof ApiTrigger
     */
    cron_schedule?: ApiCronSchedule;
    /**
     * 
     * @type {ApiPeriodicSchedule}
     * @memberof ApiTrigger
     */
    periodic_schedule?: ApiPeriodicSchedule;
}

/**
 * Required input.   - DISABLED: The job won't schedule any run if disabled.
 * @export
 * @enum {string}
 */
export enum JobMode {
    UNKNOWNMODE = <any> 'UNKNOWN_MODE',
    ENABLED = <any> 'ENABLED',
    DISABLED = <any> 'DISABLED'
}

/**
 * `Any` contains an arbitrary serialized protocol buffer message along with a URL that describes the type of the serialized message.  Protobuf library provides support to pack/unpack Any values in the form of utility functions or additional generated methods of the Any type.  Example 1: Pack and unpack a message in C++.      Foo foo = ...;     Any any;     any.PackFrom(foo);     ...     if (any.UnpackTo(&foo)) {       ...     }  Example 2: Pack and unpack a message in Java.      Foo foo = ...;     Any any = Any.pack(foo);     ...     if (any.is(Foo.class)) {       foo = any.unpack(Foo.class);     }   Example 3: Pack and unpack a message in Python.      foo = Foo(...)     any = Any()     any.Pack(foo)     ...     if any.Is(Foo.DESCRIPTOR):       any.Unpack(foo)       ...   Example 4: Pack and unpack a message in Go       foo := &pb.Foo{...}      any, err := ptypes.MarshalAny(foo)      ...      foo := &pb.Foo{}      if err := ptypes.UnmarshalAny(any, foo); err != nil {        ...      }  The pack methods provided by protobuf library will by default use 'type.googleapis.com/full.type.name' as the type URL and the unpack methods only use the fully qualified type name after the last '/' in the type URL, for example \"foo.bar.com/x/y.z\" will yield type name \"y.z\".   JSON ==== The JSON representation of an `Any` value uses the regular representation of the deserialized, embedded message, with an additional field `@type` which contains the type URL. Example:      package google.profile;     message Person {       string first_name = 1;       string last_name = 2;     }      {       \"@type\": \"type.googleapis.com/google.profile.Person\",       \"firstName\": <string>,       \"lastName\": <string>     }  If the embedded message type is well-known and has a custom JSON representation, that representation will be embedded adding a field `value` which holds the custom JSON in addition to the `@type` field. Example (for message [google.protobuf.Duration][]):      {       \"@type\": \"type.googleapis.com/google.protobuf.Duration\",       \"value\": \"1.212s\"     }
 * @export
 * @interface ProtobufAny
 */
export interface ProtobufAny {
    /**
     * A URL/resource name that uniquely identifies the type of the serialized protocol buffer message. The last segment of the URL's path must represent the fully qualified name of the type (as in `path/google.protobuf.Duration`). The name should be in a canonical form (e.g., leading \".\" is not accepted).  In practice, teams usually precompile into the binary all types that they expect it to use in the context of Any. However, for URLs which use the scheme `http`, `https`, or no scheme, one can optionally set up a type server that maps type URLs to message definitions as follows:  * If no scheme is provided, `https` is assumed. * An HTTP GET on the URL must yield a [google.protobuf.Type][]   value in binary format, or produce an error. * Applications are allowed to cache lookup results based on the   URL, or have them precompiled into a binary to avoid any   lookup. Therefore, binary compatibility needs to be preserved   on changes to types. (Use versioned type names to manage   breaking changes.)  Note: this functionality is not currently available in the official protobuf release, and it is not used for type URLs beginning with type.googleapis.com.  Schemes other than `http`, `https` (or the empty scheme) might be used with implementation specific semantics.
     * @type {string}
     * @memberof ProtobufAny
     */
    type_url?: string;
    /**
     * Must be a valid serialized protocol buffer of the above specified type.
     * @type {string}
     * @memberof ProtobufAny
     */
    value?: string;
}


/**
 * JobServiceApi - fetch parameter creator
 * @export
 */
export const JobServiceApiFetchParamCreator = function (configuration?: Configuration) {
    return {
        /**
         * 
         * @param {ApiJob} body The job to be created
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createJob(body: ApiJob, options: any = {}): FetchArgs {
            // verify required parameter 'body' is not null or undefined
            if (body === null || body === undefined) {
                throw new RequiredError('body','Required parameter body was null or undefined when calling createJob.');
            }
            const localVarPath = `/apis/v1beta1/jobs`;
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'POST' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            localVarHeaderParameter['Content-Type'] = 'application/json';

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);
            const needsSerialization = (<any>"ApiJob" !== "string") || localVarRequestOptions.headers['Content-Type'] === 'application/json';
            localVarRequestOptions.body =  needsSerialization ? JSON.stringify(body || {}) : (body || "");

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be deleted
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteJob(id: string, options: any = {}): FetchArgs {
            // verify required parameter 'id' is not null or undefined
            if (id === null || id === undefined) {
                throw new RequiredError('id','Required parameter id was null or undefined when calling deleteJob.');
            }
            const localVarPath = `/apis/v1beta1/jobs/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'DELETE' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be disabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        disableJob(id: string, options: any = {}): FetchArgs {
            // verify required parameter 'id' is not null or undefined
            if (id === null || id === undefined) {
                throw new RequiredError('id','Required parameter id was null or undefined when calling disableJob.');
            }
            const localVarPath = `/apis/v1beta1/jobs/{id}/disable`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'POST' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be enabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        enableJob(id: string, options: any = {}): FetchArgs {
            // verify required parameter 'id' is not null or undefined
            if (id === null || id === undefined) {
                throw new RequiredError('id','Required parameter id was null or undefined when calling enableJob.');
            }
            const localVarPath = `/apis/v1beta1/jobs/{id}/enable`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'POST' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be retrieved
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJob(id: string, options: any = {}): FetchArgs {
            // verify required parameter 'id' is not null or undefined
            if (id === null || id === undefined) {
                throw new RequiredError('id','Required parameter id was null or undefined when calling getJob.');
            }
            const localVarPath = `/apis/v1beta1/jobs/{id}`
                .replace(`{${"id"}}`, encodeURIComponent(String(id)));
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'GET' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
        /**
         * 
         * @param {string} [page_token] 
         * @param {number} [page_size] 
         * @param {string} [sort_by] Can be format of \&quot;field_name\&quot;, \&quot;field_name asc\&quot; or \&quot;field_name des\&quot; Ascending by default.
         * @param {'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION'} [resource_reference_key_type] The type of the resource that referred to.
         * @param {string} [resource_reference_key_id] The ID of the resource that referred to.
         * @param {string} [filter] A base-64 encoded, JSON-serialized Filter protocol buffer (see filter.proto).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listJobs(page_token?: string, page_size?: number, sort_by?: string, resource_reference_key_type?: 'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION', resource_reference_key_id?: string, filter?: string, options: any = {}): FetchArgs {
            const localVarPath = `/apis/v1beta1/jobs`;
            const localVarUrlObj = url.parse(localVarPath, true);
            const localVarRequestOptions = Object.assign({ method: 'GET' }, options);
            const localVarHeaderParameter = {} as any;
            const localVarQueryParameter = {} as any;

            // authentication Bearer required
            if (configuration && configuration.apiKey) {
                const localVarApiKeyValue = typeof configuration.apiKey === 'function'
					? configuration.apiKey("authorization")
					: configuration.apiKey;
                localVarHeaderParameter["authorization"] = localVarApiKeyValue;
            }

            if (page_token !== undefined) {
                localVarQueryParameter['page_token'] = page_token;
            }

            if (page_size !== undefined) {
                localVarQueryParameter['page_size'] = page_size;
            }

            if (sort_by !== undefined) {
                localVarQueryParameter['sort_by'] = sort_by;
            }

            if (resource_reference_key_type !== undefined) {
                localVarQueryParameter['resource_reference_key.type'] = resource_reference_key_type;
            }

            if (resource_reference_key_id !== undefined) {
                localVarQueryParameter['resource_reference_key.id'] = resource_reference_key_id;
            }

            if (filter !== undefined) {
                localVarQueryParameter['filter'] = filter;
            }

            localVarUrlObj.query = Object.assign({}, localVarUrlObj.query, localVarQueryParameter, options.query);
            // fix override query string Detail: https://stackoverflow.com/a/7517673/1077943
            delete localVarUrlObj.search;
            localVarRequestOptions.headers = Object.assign({}, localVarHeaderParameter, options.headers);

            return {
                url: url.format(localVarUrlObj),
                options: localVarRequestOptions,
            };
        },
    }
};

/**
 * JobServiceApi - functional programming interface
 * @export
 */
export const JobServiceApiFp = function(configuration?: Configuration) {
    return {
        /**
         * 
         * @param {ApiJob} body The job to be created
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createJob(body: ApiJob, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<ApiJob> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).createJob(body, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be deleted
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteJob(id: string, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<any> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).deleteJob(id, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be disabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        disableJob(id: string, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<any> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).disableJob(id, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be enabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        enableJob(id: string, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<any> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).enableJob(id, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
        /**
         * 
         * @param {string} id The ID of the job to be retrieved
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJob(id: string, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<ApiJob> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).getJob(id, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
        /**
         * 
         * @param {string} [page_token] 
         * @param {number} [page_size] 
         * @param {string} [sort_by] Can be format of \&quot;field_name\&quot;, \&quot;field_name asc\&quot; or \&quot;field_name des\&quot; Ascending by default.
         * @param {'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION'} [resource_reference_key_type] The type of the resource that referred to.
         * @param {string} [resource_reference_key_id] The ID of the resource that referred to.
         * @param {string} [filter] A base-64 encoded, JSON-serialized Filter protocol buffer (see filter.proto).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listJobs(page_token?: string, page_size?: number, sort_by?: string, resource_reference_key_type?: 'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION', resource_reference_key_id?: string, filter?: string, options?: any): (fetch?: FetchAPI, basePath?: string) => Promise<ApiListJobsResponse> {
            const localVarFetchArgs = JobServiceApiFetchParamCreator(configuration).listJobs(page_token, page_size, sort_by, resource_reference_key_type, resource_reference_key_id, filter, options);
            return (fetch: FetchAPI = portableFetch, basePath: string = BASE_PATH) => {
                return fetch(basePath + localVarFetchArgs.url, localVarFetchArgs.options).then((response) => {
                    if (response.status >= 200 && response.status < 300) {
                        return response.json();
                    } else {
                        throw response;
                    }
                });
            };
        },
    }
};

/**
 * JobServiceApi - factory interface
 * @export
 */
export const JobServiceApiFactory = function (configuration?: Configuration, fetch?: FetchAPI, basePath?: string) {
    return {
        /**
         * 
         * @param {ApiJob} body The job to be created
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        createJob(body: ApiJob, options?: any) {
            return JobServiceApiFp(configuration).createJob(body, options)(fetch, basePath);
        },
        /**
         * 
         * @param {string} id The ID of the job to be deleted
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        deleteJob(id: string, options?: any) {
            return JobServiceApiFp(configuration).deleteJob(id, options)(fetch, basePath);
        },
        /**
         * 
         * @param {string} id The ID of the job to be disabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        disableJob(id: string, options?: any) {
            return JobServiceApiFp(configuration).disableJob(id, options)(fetch, basePath);
        },
        /**
         * 
         * @param {string} id The ID of the job to be enabled
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        enableJob(id: string, options?: any) {
            return JobServiceApiFp(configuration).enableJob(id, options)(fetch, basePath);
        },
        /**
         * 
         * @param {string} id The ID of the job to be retrieved
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        getJob(id: string, options?: any) {
            return JobServiceApiFp(configuration).getJob(id, options)(fetch, basePath);
        },
        /**
         * 
         * @param {string} [page_token] 
         * @param {number} [page_size] 
         * @param {string} [sort_by] Can be format of \&quot;field_name\&quot;, \&quot;field_name asc\&quot; or \&quot;field_name des\&quot; Ascending by default.
         * @param {'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION'} [resource_reference_key_type] The type of the resource that referred to.
         * @param {string} [resource_reference_key_id] The ID of the resource that referred to.
         * @param {string} [filter] A base-64 encoded, JSON-serialized Filter protocol buffer (see filter.proto).
         * @param {*} [options] Override http request option.
         * @throws {RequiredError}
         */
        listJobs(page_token?: string, page_size?: number, sort_by?: string, resource_reference_key_type?: 'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION', resource_reference_key_id?: string, filter?: string, options?: any) {
            return JobServiceApiFp(configuration).listJobs(page_token, page_size, sort_by, resource_reference_key_type, resource_reference_key_id, filter, options)(fetch, basePath);
        },
    };
};

/**
 * JobServiceApi - object-oriented interface
 * @export
 * @class JobServiceApi
 * @extends {BaseAPI}
 */
export class JobServiceApi extends BaseAPI {
    /**
     * 
     * @param {ApiJob} body The job to be created
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public createJob(body: ApiJob, options?: any) {
        return JobServiceApiFp(this.configuration).createJob(body, options)(this.fetch, this.basePath);
    }

    /**
     * 
     * @param {string} id The ID of the job to be deleted
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public deleteJob(id: string, options?: any) {
        return JobServiceApiFp(this.configuration).deleteJob(id, options)(this.fetch, this.basePath);
    }

    /**
     * 
     * @param {string} id The ID of the job to be disabled
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public disableJob(id: string, options?: any) {
        return JobServiceApiFp(this.configuration).disableJob(id, options)(this.fetch, this.basePath);
    }

    /**
     * 
     * @param {string} id The ID of the job to be enabled
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public enableJob(id: string, options?: any) {
        return JobServiceApiFp(this.configuration).enableJob(id, options)(this.fetch, this.basePath);
    }

    /**
     * 
     * @param {string} id The ID of the job to be retrieved
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public getJob(id: string, options?: any) {
        return JobServiceApiFp(this.configuration).getJob(id, options)(this.fetch, this.basePath);
    }

    /**
     * 
     * @param {string} [page_token] 
     * @param {number} [page_size] 
     * @param {string} [sort_by] Can be format of \&quot;field_name\&quot;, \&quot;field_name asc\&quot; or \&quot;field_name des\&quot; Ascending by default.
     * @param {'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION'} [resource_reference_key_type] The type of the resource that referred to.
     * @param {string} [resource_reference_key_id] The ID of the resource that referred to.
     * @param {string} [filter] A base-64 encoded, JSON-serialized Filter protocol buffer (see filter.proto).
     * @param {*} [options] Override http request option.
     * @throws {RequiredError}
     * @memberof JobServiceApi
     */
    public listJobs(page_token?: string, page_size?: number, sort_by?: string, resource_reference_key_type?: 'UNKNOWN_RESOURCE_TYPE' | 'EXPERIMENT' | 'JOB' | 'PIPELINE' | 'PIPELINE_VERSION', resource_reference_key_id?: string, filter?: string, options?: any) {
        return JobServiceApiFp(this.configuration).listJobs(page_token, page_size, sort_by, resource_reference_key_type, resource_reference_key_id, filter, options)(this.fetch, this.basePath);
    }

}


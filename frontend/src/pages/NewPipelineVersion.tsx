/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from 'react';
import BusyButton from '../atoms/BusyButton';
import Button from '@material-ui/core/Button';
import Buttons from '../lib/Buttons';
import Dropzone from 'react-dropzone';
import Input from '../atoms/Input';
import { Page } from './Page';
import { RoutePage, QUERY_PARAMS, RouteParams } from '../components/Router';
import { TextFieldProps } from '@material-ui/core/TextField';
import { ToolbarProps } from '../components/Toolbar';
import { URLParser } from '../lib/URLParser';
import { classes, stylesheet } from 'typestyle';
import { commonCss, padding, color, fontsize, zIndex } from '../Css';
import { logger, errorToMessage } from '../lib/Utils';
import ResourceSelector from './ResourceSelector';
import InputAdornment from '@material-ui/core/InputAdornment';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import { ApiResourceType } from '../apis/run';
import { Apis, PipelineSortKeys } from '../lib/Apis';
import { ApiPipeline, ApiPipelineVersion } from '../apis/pipeline';
import { CustomRendererProps } from '../components/CustomTable';
import { Description } from '../components/Description';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import Radio from '@material-ui/core/Radio';
import {runInThisContext} from 'vm';

interface NewPipelineVersionState {
  validationError: string;
  isbeingCreated: boolean;
  errorMessage: string;

  pipelineDescription: string;
  pipelineId?: string;
  pipelineName?: string;
  pipelineVersionName: string;
  pipeline?: ApiPipeline;

  codeSourceUrl: string;

  // Package can be local file or url
  importMethod: ImportMethod;
  fileName: string;
  file: File | null;
  packageUrl: string;
  dropzoneActive: boolean;

  // Create a new pipeline or not
  newPipeline: boolean;

  // Select existing pipeline
  pipelineSelectorOpen: boolean;
  unconfirmedSelectedPipeline?: ApiPipeline;
}

export enum ImportMethod {
  LOCAL = 'local',
  URL = 'url',
}

const css = stylesheet({
  dropOverlay: {
    backgroundColor: color.lightGrey,
    border: '2px dashed #aaa',
    bottom: 0,
    left: 0,
    padding: '2.5em 0',
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 0,
    zIndex: zIndex.DROP_ZONE_OVERLAY,
  },
  errorMessage: {
    color: 'red',
  },
  explanation: {
    fontSize: fontsize.small,
  },
  nonEditableInput: {
    color: color.secondaryText,
  },
  selectorDialog: {
    // If screen is small, use calc(100% - 120px). If screen is big, use 1200px.
    maxWidth: 1200, // override default maxWidth to expand this dialog further
    minWidth: 680,
    width: 'calc(100% - 120px)',
  },
});

const descriptionCustomRenderer: React.FC<CustomRendererProps<string>> = props => {
  return <Description description={props.value || ''} forceInline={true} />;
};

class NewPipelineVersion extends Page<{}, NewPipelineVersionState> {
  private _dropzoneRef = React.createRef<Dropzone & HTMLDivElement>();
  private _pipelineVersionNameRef = React.createRef<HTMLInputElement>();
  private _pipelineNameRef = React.createRef<HTMLInputElement>();
  private _pipelineDescriptionRef = React.createRef<HTMLInputElement>();

  private pipelineSelectorColumns = [
    { label: 'Pipeline name', flex: 1, sortKey: PipelineSortKeys.NAME },
    { label: 'Description', flex: 2, customRenderer: descriptionCustomRenderer },
    { label: 'Uploaded on', flex: 1, sortKey: PipelineSortKeys.CREATED_AT },
  ];

  constructor(props: any) {
    super(props);

    this.state = {
      codeSourceUrl: '',
      errorMessage: '',
      fileName: '',
      file: null,
      importMethod: ImportMethod.URL,
      isbeingCreated: false,
      newPipeline: true,
      packageUrl: '',
      pipelineDescription: '',
      pipelineId: '',
      pipelineName: '',
      pipelineSelectorOpen: false,
      pipelineVersionName: '',
      validationError: '',
      dropzoneActive: false,
    };
  }

  public getInitialToolbarState(): ToolbarProps {
    return {
      actions: {},
      breadcrumbs: [{ displayName: 'Pipeline Versions', href: RoutePage.PIPELINE_DETAILS }],
      pageTitle: 'New pipeline version',
    };
  }

  public render(): JSX.Element {
    const {
      pipelineVersionName,
      packageUrl,
      pipelineName,
      isbeingCreated,
      validationError,
      pipelineSelectorOpen,
      unconfirmedSelectedPipeline,
      codeSourceUrl,
      importMethod,
      newPipeline,
      pipelineDescription,
      fileName,
      file,
      dropzoneActive,
    } = this.state;

    const buttons = new Buttons(this.props, this.refresh.bind(this));

    return (
      <div className={classes(commonCss.page, padding(20, 'lr'))}>
        <div className={classes(commonCss.scrollContainer, padding(20, 'lr'))}>
          <div className={commonCss.header}>Pipeline version details</div>
          <div className={css.explanation}>Create a new pipeline version under a choosen pipeline with the specified pipeline package.</div>

          {/* Two subpages: one for creating version under existing pipeline and one for creating version under new pipeline */}
          <div className={classes(commonCss.flex, padding(10, 'b'))}>
            <FormControlLabel
              id='createPipelineVersionUnderNewPipelineBtn'
              label='Create a new pipeline'
              checked={newPipeline === true}
              control={<Radio color='primary' />}
              onChange={() => this.setState({ newPipeline: true })}
            />
            <FormControlLabel
              id='createPipelineVersionUnderExistingPipelineBtn'
              label='Create a new pipeline version under an existing pipeline'
              checked={newPipeline === false}
              control={<Radio color='primary' />}
              onChange={() => this.setState({ newPipeline: false })}
            />
          </div>

          {newPipeline === true && (
            <React.Fragment>
            <Input
              id='newPipelineName'
              value={pipelineName}
              required={true}
              label='New Pipeline Name'
              variant='outlined'
              inputRef={this._pipelineNameRef}
              onChange={this.handleChange('pipelineName')}
              autoFocus={true}
            />

            <Input
              id='pipelineDescription'
              value={pipelineDescription}
              required={true}
              label='New Pipeline Description'
              variant='outlined'
              inputRef={this._pipelineDescriptionRef}
              onChange={this.handleChange('pipelineDescription')}
              autoFocus={true}
            />

            {/* Set pipeline version name */}
            <Input
              id='pipelineVersionName'
              label='Pipeline Version name'
              inputRef={this._pipelineVersionNameRef}
              required={true}
              onChange={this.handleChange('pipelineVersionName')}
              value={pipelineVersionName}
              autoFocus={true}
              variant='outlined'
            />

            {/* Choose a local file for package or specify a url for package */}
            <div className={classes(commonCss.flex, padding(10, 'b'))}>
              <FormControlLabel
                id='localPackageBtn'
                label='Upload a file'
                checked={ importMethod === ImportMethod.LOCAL }
                control={<Radio color='primary' />}
                onChange={() => this.setState({ importMethod: ImportMethod.LOCAL })}
              />
              <Dropzone
                id='dropZone'
                disableClick={true}
                onDrop={this._onDrop.bind(this)}
                onDragEnter={this._onDropzoneDragEnter.bind(this)}
                onDragLeave={this._onDropzoneDragLeave.bind(this)}
                style={{ position: 'relative' }}
                ref={this._dropzoneRef}
                inputProps={{ tabIndex: -1 }}
                disabled={ importMethod === ImportMethod.URL }
              >
              {dropzoneActive && <div className={css.dropOverlay}>Drop files..</div>}
              <Input
                  onChange={this.handleChange('fileName')}
                  value={fileName}
                  required={true}
                  label='File'
                  variant='outlined'
                  disabled={ importMethod === ImportMethod.URL }
                  // Find a better to align this input box with others
                  InputProps={{
                    style: {
                      maxWidth: 2000,
                      width: 455,
                    },
                    endAdornment: (
                      <InputAdornment position='end'>
                        <Button
                          color='secondary'
                          onClick={() => this._dropzoneRef.current!.open()}
                          style={{ padding: '3px 5px', margin: 0, whiteSpace: 'nowrap' }}
                          disabled={ importMethod === ImportMethod.URL }
                        >
                          Choose file
                        </Button>
                      </InputAdornment>
                    ),
                    readOnly: true,
                  }}
                />
              </Dropzone>
            </div>
            <div className={classes(commonCss.flex, padding(10, 'b'))}>
              <FormControlLabel
                id='remotePackageBtn'
                label='Import by url'
                checked={ importMethod === ImportMethod.URL }
                control={<Radio color='primary' />}
                onChange={() => this.setState({ importMethod: ImportMethod.URL })}
              />
              <Input
                id='pipelinePackageUrl'
                label='Package Url'
                multiline={true}
                onChange={this.handleChange('packageUrl')}
                value={packageUrl}
                variant='outlined'
                disabled={ importMethod === ImportMethod.LOCAL }
                // Find a better to align this input box with others
                style={{
                  maxWidth: 2000,
                  width: 465,
                }}
              />
            </div>

            {/* Fill pipeline version code source url */}
            <Input
              id='pipelineVersionCodeSource'
              label='Code Source (optional)'
              multiline={true}
              onChange={this.handleChange('codeSourceUrl')}
              value={codeSourceUrl}
              variant='outlined'
            />
            </React.Fragment>
          )}

          {newPipeline === false  && (
            <React.Fragment>
            {/* Select pipeline */}
            <Input
              value={pipelineName}
              required={true}
              label='Pipeline'
              disabled={true}
              variant='outlined'
              inputRef={this._pipelineNameRef}
              onChange={this.handleChange('pipelineName')}
              autoFocus={true}
              InputProps={{
                classes: { disabled: css.nonEditableInput },
                endAdornment: (
                  <InputAdornment position='end'>
                    <Button
                      color='secondary'
                      id='choosePipelineBtn'
                      onClick={() => this.setStateSafe({ pipelineSelectorOpen: true })}
                      style={{ padding: '3px 5px', margin: 0 }}
                    >
                      Choose
                    </Button>
                  </InputAdornment>
                ),
                readOnly: true,
              }}
            />
            <Dialog
              open={pipelineSelectorOpen}
              classes={{ paper: css.selectorDialog }}
              onClose={() => this._pipelineSelectorClosed(false)}
              PaperProps={{ id: 'pipelineSelectorDialog' }}
            >
              <DialogContent>
                <ResourceSelector
                  {...this.props}
                  title='Choose a pipeline'
                  filterLabel='Filter pipelines'
                  listApi={async (...args) => {
                    const response = await Apis.pipelineServiceApi.listPipelines(...args);
                    return {
                      nextPageToken: response.next_page_token || '',
                      resources: response.pipelines || [],
                    };
                  }}
                  columns={this.pipelineSelectorColumns}
                  emptyMessage='No pipelines found. Upload a pipeline and then try again.'
                  initialSortColumn={PipelineSortKeys.CREATED_AT}
                  selectionChanged={(selectedPipeline: ApiPipeline) =>
                    this.setStateSafe({ unconfirmedSelectedPipeline: selectedPipeline })
                  }
                  toolbarActionMap={buttons
                    .upload(() => this.setStateSafe({ pipelineSelectorOpen: false }))
                    .getToolbarActionMap()}
                />
              </DialogContent>
              <DialogActions>
                <Button
                  id='cancelPipelineSelectionBtn'
                  onClick={() => this._pipelineSelectorClosed(false)}
                  color='secondary'
                >
                  Cancel
                </Button>
                <Button
                  id='usePipelineBtn'
                  onClick={() => this._pipelineSelectorClosed(true)}
                  color='secondary'
                  disabled={!unconfirmedSelectedPipeline}
                >
                  Use this pipeline
                </Button>
              </DialogActions>
            </Dialog>

            {/* Set pipeline version name */}
            <Input
              id='pipelineVersionName'
              label='Pipeline Version name'
              inputRef={this._pipelineVersionNameRef}
              required={true}
              onChange={this.handleChange('pipelineVersionName')}
              value={pipelineVersionName}
              autoFocus={true}
              variant='outlined'
            />

            {/* Fill pipeline package url */}
            <Input
              id='pipelineVersionPackageUrl'
              label='Package Url'
              multiline={true}
              onChange={this.handleChange('packageUrl')}
              value={packageUrl}
              variant='outlined'
            />

            {/* Fill pipeline version code source url */}
            <Input
              id='pipelineVersionCodeSource'
              label='Code Source (optional)'
              multiline={true}
              onChange={this.handleChange('codeSourceUrl')}
              value={codeSourceUrl}
              variant='outlined'
            />
            </React.Fragment>
          )}

          {/* Create pipeline version */}
          <div className={commonCss.flex}>
            <BusyButton
              id='createPipelineVersionBtn'
              disabled={!!validationError}
              busy={isbeingCreated}
              className={commonCss.buttonAction}
              title={'Create'}
              onClick={this._create.bind(this)}
            />
            <Button
              id='cancelNewPipelineVersionBtn'
              onClick={() => this.props.history.push(RoutePage.PIPELINES)}
            >
              Cancel
            </Button>
            <div className={css.errorMessage}>{validationError}</div>
          </div>
        </div>
      </div>
    );
  }

  public async refresh(): Promise<void> {
    return;
  }

  public async componentDidMount(): Promise<void> {
    const urlParser = new URLParser(this.props);
    const pipelineId = urlParser.get(QUERY_PARAMS.pipelineId);
    if (pipelineId) {
      const apiPipeline = await Apis.pipelineServiceApi.getPipeline(pipelineId);
      this.setState({ pipelineId, pipelineName: apiPipeline.name });
    }

    this._validate();
  }

  public handleChange = (name: string) => (event: any) => {
    const value = (event.target as TextFieldProps).value;
    this.setState({ [name]: value } as any, this._validate.bind(this));
    if (name === 'pipelineName') {
      // Suggest a version name based on pipeline name
      const currDate = new Date();
      this.setState({ pipelineVersionName: value + '_version_at_' + currDate.toISOString() } , this._validate.bind(this));
    }
  };

  protected async _pipelineSelectorClosed(confirmed: boolean): Promise<void> {
    let { pipeline } = this.state;
    const currDate = new Date();
    if (confirmed && this.state.unconfirmedSelectedPipeline) {
      pipeline = this.state.unconfirmedSelectedPipeline;
    }

    this.setStateSafe(
      {
        pipeline,
        pipelineId: (pipeline && pipeline.id) || '',
        pipelineName: (pipeline && pipeline.name) || '',
        pipelineSelectorOpen: false,
        // Suggest a version name based on pipeline name
        pipelineVersionName: (pipeline && (pipeline.name + '_version_at_' + currDate.toISOString())) || '',
      },
      () => this._validate(),
    );
  }

  private async _create(): Promise<void> {
   if (this.state.importMethod === ImportMethod.URL) {
      this._createFromUrl();
    }

    if (this.state.importMethod === ImportMethod.LOCAL) {
      this._createFromLocalFile();
    }
  }

  private async _createFromUrl(): Promise<void> {
    const getPipelineId = async () => {
      if (this.state.pipelineId) {
        // Get existing pipeline's id.
        return this.state.pipelineId;
      } else {
        // Get the new pipeline's id.
        // The new pipeline version is going to be put under this new pipeline
        // instead of an eixsting pipeline. So create this new pipeline first.
        const newPipeline: ApiPipeline = {
          description: this.state.pipelineDescription,
          name: this.state.pipelineName,
          url: { pipeline_url: this.state.packageUrl },
        };
        const response = await Apis.pipelineServiceApi.createPipeline(newPipeline);
        return response.id!;
      }
    };

    this.setState({ isbeingCreated: true }, async () => {
      try {
        const newPipelineVersion: ApiPipelineVersion = {
          code_source_url: this.state.codeSourceUrl,
          name: this.state.pipelineVersionName,
          package_url: { pipeline_url: this.state.packageUrl },
          resource_references: [
            { key: { id: await getPipelineId(), type: ApiResourceType.PIPELINE }, relationship: 1 },
          ],
        };
        console.log('JING create version with: ' + JSON.stringify(newPipelineVersion));
        const response = await Apis.pipelineServiceApi.createPipelineVersion(newPipelineVersion);
        this.props.history.push(
          RoutePage.PIPELINE_DETAILS.replace(
            `:${RouteParams.pipelineId}`,
            response.resource_references![0].key!.id! /* pipeline id of this version */,
          ).replace(`:${RouteParams.pipelineVersionId}`, response.id!),
        );
        this.props.updateSnackbar({
          autoHideDuration: 10000,
          message: `Successfully created new pipeline version: ${response.name}`,
          open: true,
        });
      } catch (err) {
        const errorMessage = await errorToMessage(err);
        await this.showErrorDialog('Pipeline version creation failed', errorMessage);
        logger.error('Error creating pipeline version:', err);
        this.setState({ isbeingCreated: false });
      }
    });
  }

  private async _createFromLocalFile(): Promise<void> {
    const getPipelineId = async () => {
      if (this.state.pipelineId) {
        // Get existing pipeline's id.
        return this.state.pipelineId;
      } else {
        // Get the new pipeline's id.
        // The new pipeline version is going to be put under this new pipeline
        // instead of an eixsting pipeline. So create this new pipeline first.
        const newPipeline: ApiPipeline = {
          description: this.state.pipelineDescription,
          name: this.state.pipelineName,
          url: { pipeline_url: this.state.packageUrl },
        };
        const response = await Apis.pipelineServiceApi.createPipeline(newPipeline);
        return response.id!;
      }
    };

    this.setState({ isbeingCreated: true }, async () => {
      try {
        const response = await Apis.uploadPipelineVersion(
          this.state.pipelineVersionName,
          this.state.file!,
          await getPipelineId(),
          this.state.pipelineName || '',
          this.state.codeSourceUrl);
        this.props.history.push(
          RoutePage.PIPELINE_DETAILS.replace(
            `:${RouteParams.pipelineId}`,
            response.resource_references![0].key!.id! /* pipeline id of this version */,
          ).replace(`:${RouteParams.pipelineVersionId}`, response.id!),
        );
        this.props.updateSnackbar({
          autoHideDuration: 10000,
          message: `Successfully created new pipeline version: ${response.name}`,
          open: true,
        });
      } catch (err) {
        const errorMessage = await errorToMessage(err);
        await this.showErrorDialog('Pipeline version creation failed', errorMessage);
        logger.error('Error creating pipeline version:', err);
        this.setState({ isbeingCreated: false });
      }
    });
  }

  private _validate(): void {
    // Validate state
    const { pipeline, pipelineVersionName, packageUrl, newPipeline } = this.state;
    try {
      if (!pipelineVersionName) {
        throw new Error('Pipeline version name is required');
      }
      if (!pipeline && !newPipeline) {
        throw new Error('Pipeline is required');
      }
      if (!packageUrl) {
        throw new Error('Please specify a pipeline package in .yaml, .zip, or .tar.gz');
      }
      this.setState({ validationError: '' });
    } catch (err) {
      this.setState({ validationError: err.message });
    }
  }

  private _onDropzoneDragEnter(): void {
    this.setState({ dropzoneActive: true });
  }

  private _onDropzoneDragLeave(): void {
    this.setState({ dropzoneActive: false });
  }

  private _onDrop(files: File[]): void {
    this.setState({
      dropzoneActive: false,
      file: files[0],
      fileName: files[0].name,
      // Suggest all characters left of first . as pipeline name
      // uploadPipelineName: files[0].name.split('.')[0],
    });
  }
}

export default NewPipelineVersion;

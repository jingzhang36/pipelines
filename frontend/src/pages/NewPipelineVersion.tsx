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
import Input from '../atoms/Input';
import { Page } from './Page';
import { RoutePage, QUERY_PARAMS, RouteParams } from '../components/Router';
import { TextFieldProps } from '@material-ui/core/TextField';
import { ToolbarProps } from '../components/Toolbar';
import { URLParser } from '../lib/URLParser';
import { classes, stylesheet } from 'typestyle';
import { commonCss, padding, color, fontsize } from '../Css';
import { logger, errorToMessage } from '../lib/Utils';
import ResourceSelector from './ResourceSelector';
import InputAdornment from '@material-ui/core/InputAdornment';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import {
  ApiRun,
  ApiResourceReference,
  ApiRelationship,
  ApiResourceType,
  ApiRunDetail,
  ApiPipelineRuntime,
} from '../apis/run';
import { Apis, PipelineSortKeys } from '../lib/Apis';
import { ApiPipeline, ApiParameter, ApiPipelineVersion, ApiUrl } from '../apis/pipeline';
import { CustomRendererProps } from '../components/CustomTable';
import { Description } from '../components/Description';

interface NewPipelineVersionState {
  validationError: string;
  isbeingCreated: boolean;
  pipelineVersionName: string;
  pipelineId?: string;
  pipelineName?: string;
  pipeline?: ApiPipeline;
  errorMessage: string;
  packageUrl: string;
  codeSourceUrl: string;

  // For pipeline selector
  pipelineSelectorOpen: boolean;
  unconfirmedSelectedPipeline?: ApiPipeline;
}

const css = stylesheet({
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
  private _pipelineVersionNameRef = React.createRef<HTMLInputElement>();
  private _pipelineNameRef = React.createRef<HTMLInputElement>();

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
      isbeingCreated: false,
      packageUrl: '',
      pipelineId: '',
      pipelineName: '',
      pipelineSelectorOpen: false,
      pipelineVersionName: '',
      validationError: '',
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
      errorMessage,
      codeSourceUrl,
    } = this.state;

    const buttons = new Buttons(this.props, this.refresh.bind(this));

    return (
      <div className={classes(commonCss.page, padding(20, 'lr'))}>
        <div className={classes(commonCss.scrollContainer, padding(20, 'lr'))}>
          <div className={commonCss.header}>Pipeline version details</div>
          {/* TODO: this description needs work. */}
          <div className={css.explanation}>TODO</div>

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

          {/* Fill pipeline package url */}
          <Input
            id='pipelineVersionDescription'
            label='Package Url'
            multiline={true}
            onChange={this.handleChange('packageUrl')}
            value={packageUrl}
            variant='outlined'
          />

          {/* Fill pipeline version description */}
          {/* <Input
            id='pipelineVersionDescription'
            label='Description (optional)'
            multiline={true}
            onChange={this.handleChange('description')}
            value={description}
            variant='outlined'
          /> */}

          {/* Fill pipeline version code source url */}
          <Input
            id='pipelineVersionCodeSource'
            label='Code Source (optional)'
            multiline={true}
            onChange={this.handleChange('codeSourceUrl')}
            value={codeSourceUrl}
            variant='outlined'
          />

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
  };

  protected async _pipelineSelectorClosed(confirmed: boolean): Promise<void> {
    let { pipeline } = this.state;
    if (confirmed && this.state.unconfirmedSelectedPipeline) {
      pipeline = this.state.unconfirmedSelectedPipeline;
    }

    this.setStateSafe(
      {
        pipeline,
        pipelineId: (pipeline && pipeline.id) || '',
        pipelineName: (pipeline && pipeline.name) || '',
        pipelineSelectorOpen: false,
      },
      () => this._validate(),
    );
  }

  private _create(): void {
    const newPipelineVersion: ApiPipelineVersion = {
      code_source_url: this.state.codeSourceUrl,
      name: this.state.pipelineVersionName,
      package_url: { pipeline_url: this.state.packageUrl },
      resource_references: [
        { key: { id: this.state.pipelineId!, type: ApiResourceType.PIPELINE }, relationship: 1 },
      ],
    };

    this.setState({ isbeingCreated: true }, async () => {
      try {
        const response = await Apis.pipelineServiceApi.createPipelineVersion(newPipelineVersion);
        this.props.history.push(
          RoutePage.PIPELINE_DETAILS.replace(
            `:${RouteParams.pipelineId}`,
            this.state.pipelineId!,
          ).replace(`:${RouteParams.pipelineVersionId}`, response.id!),
        );
        this.props.updateSnackbar({
          autoHideDuration: 10000,
          message: `Successfully created new pipeline version: ${newPipelineVersion.name}`,
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
    const { pipeline, pipelineVersionName, packageUrl } = this.state;
    try {
      if (!pipelineVersionName) {
        throw new Error('Pipeline version name is required');
      }
      if (!pipeline) {
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
}

export default NewPipelineVersion;
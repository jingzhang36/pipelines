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
import Input from '../atoms/Input';
import { ApiPipelineVersion } from '../apis/pipeline';
import { Apis } from '../lib/Apis';
import { Page } from './Page';
import { RoutePage, QUERY_PARAMS } from '../components/Router';
import { TextFieldProps } from '@material-ui/core/TextField';
import { ToolbarProps } from '../components/Toolbar';
import { URLParser } from '../lib/URLParser';
import { classes, stylesheet } from 'typestyle';
import { commonCss, padding, fontsize } from '../Css';
import { logger, errorToMessage } from '../lib/Utils';

interface NewPipelineVersionState {
  description: string;
  validationError: string;
  isbeingCreated: boolean;
  pipelineVersionName: string;
  pipelineId?: string;
  pipelineName?: string;
}

const css = stylesheet({
  errorMessage: {
    color: 'red',
  },
  // TODO: move to Css.tsx and probably rename.
  explanation: {
    fontSize: fontsize.small,
  },
});

class NewPipelineVersion extends Page<{}, NewPipelineVersionState> {
  private _pipelineVersionNameRef = React.createRef<HTMLInputElement>();
  private _pipelineNameRef = React.createRef<HTMLInputElement>();

  constructor(props: any) {
    super(props);

    this.state = {
      description: '',
      pipelineVersionName: '',
      pipelineId: '',
      pipelineName: '',
      isbeingCreated: false,
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
    const { description, pipelineVersionName, pipelineId, pipelineName, isbeingCreated, validationError } = this.state;

    return (
      <div className={classes(commonCss.page, padding(20, 'lr'))}>
        <div className={classes(commonCss.scrollContainer, padding(20, 'lr'))}>
          <div className={commonCss.header}>Pipeline version details</div>
          {/* TODO: this description needs work. */}
          <div className={css.explanation}>
            TODO
          </div>
          <Input
            id='pipelineName'
            label='Pipeline name'
            inputRef={this._pipelineNameRef}
            required={true}
            onChange={this.handleChange('pipelineName')}
            value={pipelineName}
            autoFocus={true}
            variant='outlined'
          />
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
          <Input
            id='pipelineVersionDescription'
            label='Description (optional)'
            multiline={true}
            onChange={this.handleChange('description')}
            value={description}
            variant='outlined'
          />

          <div className={commonCss.flex}>
            <BusyButton
              id='createPipelineVersionBtn'
              disabled={!!validationError}
              busy={isbeingCreated}
              className={commonCss.buttonAction}
              title={'Next'}
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
      this.setState({ pipelineId, pipelineName : apiPipeline.name });
    }

    this._validate();
  }

  public handleChange = (name: string) => (event: any) => {
    const value = (event.target as TextFieldProps).value;
    this.setState({ [name]: value } as any, this._validate.bind(this));
  };

  private _create(): void {
    const newPipelineVersion: ApiPipelineVersion = {
      name: this.state.pipelineVersionName,
      // code_source_url:
      // resource_references
    };

    this.setState({ isbeingCreated: true }, async () => {
      try {
        const response = await Apis.pipelineServiceApi.createPipelineVersion(newPipelineVersion);
        // let searchString = '';
        // if (this.state.pipelineId) {
        //   searchString = new URLParser(this.props).build({
        //     [QUERY_PARAMS.experimentId]: response.id || '',
        //     [QUERY_PARAMS.pipelineId]: this.state.pipelineId,
        //     [QUERY_PARAMS.firstRunInExperiment]: '1',
        //   });
        // } else {
        //   searchString = new URLParser(this.props).build({
        //     [QUERY_PARAMS.experimentId]: response.id || '',
        //     [QUERY_PARAMS.firstRunInExperiment]: '1',
        //   });
        // }
        this.props.history.push(RoutePage.PIPELINE_DETAILS + this.state.pipelineId + '/version/' + response.id);
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
    const { pipelineVersionName } = this.state;
    try {
      if (!pipelineVersionName) {
        throw new Error('Pipeline version name is required');
      }
      this.setState({ validationError: '' });
    } catch (err) {
      this.setState({ validationError: err.message });
    }
  }
}

export default NewPipelineVersion;

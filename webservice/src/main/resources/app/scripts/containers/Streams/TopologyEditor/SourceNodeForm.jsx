/**
  * Copyright 2017 Hortonworks.
  *
  * Licensed under the Apache License, Version 2.0 (the "License");
  * you may not use this file except in compliance with the License.
  * You may obtain a copy of the License at
  *   http://www.apache.org/licenses/LICENSE-2.0
  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
**/

import React, {Component, PropTypes} from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import {Tabs, Tab} from 'react-bootstrap';
import Utils from '../../../utils/Utils';
import TopologyREST from '../../../rest/TopologyREST';
import Form from '../../../libs/form';
import StreamsSidebar from '../../../components/StreamSidebar';
import NotesForm from '../../../components/NotesForm';
import FSReactToastr from '../../../components/FSReactToastr';
import CommonNotification from '../../../utils/CommonNotification';
import {toastOpt} from '../../../utils/Constants';
import {Scrollbars} from 'react-custom-scrollbars';

export default class SourceNodeForm extends Component {
  static propTypes = {
    nodeData: PropTypes.object.isRequired,
    configData: PropTypes.object.isRequired,
    editMode: PropTypes.bool.isRequired,
    nodeType: PropTypes.string.isRequired,
    topologyId: PropTypes.string.isRequired,
    versionId: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.fetchData();
    this.state = {
      formData: {},
      formErrors: {},
      streamObj: {},
      description: '',
      showRequired: true,
      showSecurity: false,
      hasSecurity: false,
      activeTabKey: 1,
      clusterArr: [],
      configJSON: [],
      clusterName: '',
      fetchLoader: true,
      securityType : ''
    };
  }

  fetchData() {
    let {topologyId, versionId, nodeType, nodeData, namespaceId} = this.props;
    const sourceParams = nodeData.parentType + '/' + nodeData.topologyComponentBundleId;
    let promiseArr = [
      TopologyREST.getNode(topologyId, versionId, nodeType, nodeData.nodeId),
      TopologyREST.getSourceComponentClusters(sourceParams, namespaceId)
    ];

    Promise.all(promiseArr).then((results) => {
      let stateObj = {}, hasSecurity = false,
        tempArr = [];
      if (results[0].responseMessage !== undefined) {
        FSReactToastr.error(
          <CommonNotification flag="error" content={results[0].responseMessage}/>, '', toastOpt);
      } else {
        this.nodeData = results[0];
        if (this.nodeData.outputStreams.length === 0) {
          this.streamObj = {
            streamId: this.props.configData.subType.toLowerCase() + '_stream_' + this.nodeData.id,
            fields: []
          };
        } else {
          this.streamObj = this.nodeData.outputStreams[0];
        }
        stateObj.streamObj = this.streamObj;
      }
      if (results[1].responseMessage !== undefined) {
        this.setState({fetchLoader: false});
        FSReactToastr.error(
          <CommonNotification flag="error" content={results[1].responseMessage}/>, '', toastOpt);
      } else {
        const clusters = results[1];
        _.keys(clusters).map((x) => {
          _.keys(clusters[x]).map(k => {
            if (k === "cluster") {
              const obj = {
                fieldName: clusters[x][k].name + '@#$' + clusters[x][k].ambariImportUrl,
                uiName: clusters[x][k].name
              };
              tempArr.push(obj);
            }
            if(k === "security"){
              hasSecurity = clusters[x][k].authentication.enabled;
            }
          });
        });
        stateObj.clusterArr = clusters;
      }
      stateObj.configJSON = this.fetchFields(stateObj.clusterArr);
      if (!_.isEmpty(stateObj.clusterArr) && _.keys(stateObj.clusterArr).length > 0) {
        stateObj.configJSON = this.pushClusterFields(tempArr, stateObj.configJSON);
      }
      stateObj.formData = this.nodeData.config.properties;
      stateObj.description = this.nodeData.description;
      stateObj.fetchLoader = false;
      stateObj.hasSecurity = hasSecurity;
      stateObj.securityType = stateObj.formData.securityProtocol || '';
      this.setState(stateObj, () => {
        if (stateObj.formData.cluster !== undefined) {
          this.updateClusterFields(stateObj.formData.cluster);
          this.setState({streamObj: this.state.streamObj});
        }
        if (_.keys(stateObj.clusterArr).length === 1) {
          stateObj.formData.cluster = _.keys(stateObj.clusterArr)[0];
          this.updateClusterFields(stateObj.formData.cluster);
        }
      });
    });
  }
  fetchFields = (clusterList) => {
    let obj = this.props.configData.topologyComponentUISpecification.fields;
    if (_.keys(clusterList).length > 0) {
      const clusterFlag = obj.findIndex(x => {
        return x.fieldName === 'clusters';
      });
      if (clusterFlag === -1) {
        const data = {
          "uiName": "Cluster Name",
          "fieldName": "clusters",
          "isOptional": false,
          "tooltip": "Cluster name to read data from",
          "type": "CustomEnumstring",
          "options": []
        };
        obj.unshift(data);
      }
    }
    return obj;
  }
  pushClusterFields = (opt, uiSpecification) => {
    const obj = uiSpecification.map(x => {
      if (x.fieldName === 'clusters') {
        x.options = opt;
      }
      return x;
    });
    return obj;
  }

  populateClusterFields(val) {
    const tempObj = Object.assign({}, this.state.formData, {topic: ''});
    // split the val by (-) to find the key by URL
    const keyName = this.getClusterKey(val.split('@#$')[1]);
    this.setState({
      clusterName: keyName,
      streamObj: '',
      formData: tempObj
    }, () => {
      this.updateClusterFields();
    });
  }

  getClusterKey(url) {
    const {clusterArr} = this.state;
    let key = '';
    _.keys(clusterArr).map(x => {
      _.keys(clusterArr[x]).map(k => {
        if (clusterArr[x][k].ambariImportUrl === url) {
          key = x;
        }
      });
    });
    return key;
  }

  updateClusterFields(name) {
    const {clusterArr, clusterName, streamObj, formData,configJSON} = this.state;
    const {FormData} = this.refs.Form.state;

    const mergeData = Utils.deepmerge(formData,FormData);
    let tempFormData = _.cloneDeep(mergeData);

    /*
      Utils.mergeFormDataFields method accept params
      name =  name of cluster
      clusterArr = clusterArr array
      tempFormData = formData is fields of form
      configJSON = fields shown on ui depends on there options

      This method is responsible for showing default value of form fields
      and prefetch the value if its already configure
    */
    const {obj,tempData} = Utils.mergeFormDataFields(name,clusterArr, clusterName, tempFormData, configJSON);

    this.setState({configJSON: obj, formData: tempData});
  }

  validateData() {
    let validDataFlag = false;
    if (!this.state.fetchLoader) {
      const {isFormValid, invalidFields} = this.refs.Form.validate();
      if (isFormValid) {
        validDataFlag = true;
        this.setState({activeTabKey: 1, showRequired: true});
      }else{
        const invalidField = invalidFields[0];

        if(invalidField.props.fieldJson.isOptional === false
            && invalidField.props.fieldJson.hint
            && invalidField.props.fieldJson.hint.indexOf('security_') > -1){
          this.setState({
            activeTabKey: 4,
            showRequired: false,
            showSecurity: true
          });
        }else if(invalidField.props.fieldJson.isOptional === false){
          this.setState({
            activeTabKey: 1,
            showRequired: true,
            showSecurity: false
          });
        }
      }
      if (this.streamObj.fields.length === 0) {
        validDataFlag = false;
        FSReactToastr.error(
          <CommonNotification flag="error" content={"Output stream fields cannot be blank."}/>, '', toastOpt);
      }
    }
    return validDataFlag;
  }

  handleSave(name) {
    let {topologyId, versionId, nodeType} = this.props;
    let nodeId = this.nodeData.id;
    let data = this.refs.Form.state.FormData;
    this.nodeData.config.properties = data;
    this.nodeData.name = name;
    if (this.nodeData.outputStreams.length > 0) {
      this.nodeData.outputStreams[0].fields = this.streamObj.fields;
    } else {
      this.nodeData.outputStreams.push({fields: this.streamObj.fields, streamId: this.streamObj.streamId, topologyId: topologyId});
    }
    this.nodeData.description = this.state.description;
    return TopologyREST.updateNode(topologyId, versionId, nodeType, nodeId, {
      body: JSON.stringify(this.nodeData)
    });
  }

  showOutputStream(resultArr) {
    this.streamObj = {
      streamId: this.props.configData.subType.toLowerCase() + '_stream_' + this.nodeData.id,
      fields: resultArr
    };
    this.setState({streamObj: this.streamObj});
  }

  onSelectTab = (eventKey) => {
    let stateObj={},activeTabKey =1,showRequired=true,showSecurity=false;
    stateObj.formData = Utils.deepmerge(this.state.formData,this.refs.Form.state.FormData);
    if (eventKey == 1) {
      activeTabKey =1;
      showRequired=true;
      showSecurity=false;
    } else if (eventKey == 2) {
      activeTabKey =2;
      showRequired=false;
      showSecurity=false;
    } else if (eventKey == 3) {
      activeTabKey =3;
    } else if (eventKey == 4) {
      activeTabKey =4;
      showRequired=false;
      showSecurity=true;
    }
    stateObj.activeTabKey = activeTabKey;
    stateObj.showRequired = showRequired;
    stateObj.showSecurity = showSecurity;
    this.setState(stateObj);
  }

  handleNotesChange(description) {
    this.setState({description: description});
  }

  handleSecurityProtocol = (securityKey) => {
    const {clusterArr,formData,clusterName} = this.state;
    const {cluster} = formData;
    let {Errors,FormData} = this.refs.Form.state;
    let tempObj = Utils.deepmerge(formData,FormData);
    if(clusterName !== undefined){
      const tempData =  Utils.mapSecurityProtocol(clusterName,securityKey,tempObj,clusterArr);
      delete Errors.bootstrapServers;
      this.refs.Form.setState({Errors});
      this.setState({formData : tempData ,securityType : securityKey});
    }
  }

  render() {
    const {configJSON, fetchLoader,securityType,activeTabKey, formErrors} = this.state;
    let formData = this.state.formData;

    let fields = Utils.genFields(configJSON, [], formData,[],securityType);
    const form = fetchLoader
      ? <div className="col-sm-12">
          <div className="loading-img text-center" style={{
            marginTop: "100px"
          }}>
            <img src="styles/img/start-loader.gif" alt="loading"/>
          </div>
        </div>
      : <div className="source-modal-form">
        <Scrollbars autoHide renderThumbHorizontal={props => <div {...props} style={{
          display: "none"
        }}/>}>
          <Form ref="Form" readOnly={!this.props.editMode} showRequired={this.state.showRequired} showSecurity={this.state.showSecurity} className="customFormClass" FormData={formData} Errors={formErrors} populateClusterFields={this.populateClusterFields.bind(this)} callback={this.showOutputStream.bind(this)} handleSecurityProtocol={this.handleSecurityProtocol.bind(this)}>
            {fields}
          </Form>
        </Scrollbars>
      </div>;
    const outputSidebar = <StreamsSidebar ref="StreamSidebar" streamObj={this.state.streamObj} streamType="output"/>;
    return (
      <Tabs id="SinkForm" activeKey={this.state.activeTabKey} className="modal-tabs" onSelect={this.onSelectTab}>
        <Tab eventKey={1} title="REQUIRED">
          {outputSidebar}
          {activeTabKey == 1 || activeTabKey == 3 ? form : null}
        </Tab>
        {
        this.state.hasSecurity ?
        <Tab eventKey={4} title="SECURITY">
          {outputSidebar}
          {activeTabKey == 4 ? form : null}
        </Tab>
        : ''
        }
        <Tab eventKey={2} title="OPTIONAL">
          {outputSidebar}
          {activeTabKey == 2 ? form : null}
        </Tab>
        <Tab eventKey={3} title="NOTES">
          <NotesForm ref="NotesForm" description={this.state.description} onChangeDescription={this.handleNotesChange.bind(this)}/>
        </Tab>
      </Tabs>
    );
  }
}

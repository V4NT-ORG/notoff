import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link is not used directly
import { withRouter } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import Web3 from 'web3';
import Column3Layout from '../component/Column3Layout';
import UserCard from '../component/UserCard';
import { isApiOk, showApiError,toast } from '../util/Function';
import GroupListItem from '../component/GroupListItem'; 
import { Button } from "@blueprintjs/core"; // Icon removed, not used directly
import DocumentTitle from 'react-document-title';

@withRouter
@withTranslation()
@inject("store")
@observer
export default class GroupList extends Component
{
    state = { groups: [], mygroups: [] }; // Initialize with empty arrays

    async componentDidMount() {
        if (!Web3.givenProvider) {
           toast(this.props.t("请先安装MetaMask等插件"));
           // Consider not initializing web3 if no provider, or handle more gracefully
        } else {
            // this.web3 = new Web3(Web3.givenProvider); // web3 instance not used elsewhere in this component
        } 
       
        await this.loadMyGroups();
        // loadGroups depends on mygroups being loaded to filter, so await loadMyGroups first.
        await this.loadGroups();
    }

    loadGroups = async () => { // Converted to arrow function for correct `this` binding if needed, though not strictly necessary here
        const { store, t } = this.props;
        const { data } = await store.getGroupTop100();
        if (isApiOk(data)) {
            if (data.data && Array.isArray(data.data)) {
                const mygroupids = this.state.mygroups.map(item => item.id);
                this.setState({ groups: data.data.filter(item => !mygroupids.includes(item.id)) });
            } else {
                this.setState({ groups: [] }); // Ensure groups is an array
            }
        } else {
            showApiError(data, t);
            this.setState({ groups: [] }); // Set to empty on error
        }
    }

    loadMyGroups = async () => { // Converted to arrow function
        const { store, t } = this.props;
        const { data } = await store.getGroupMine();
        if (isApiOk(data)) {
            if (data.data && Array.isArray(data.data)) {
                this.setState({ mygroups: data.data });
            } else {
                this.setState({ mygroups: [] }); // Ensure mygroups is an array
            }
        } else {
            showApiError(data, t);
            this.setState({ mygroups: [] }); // Set to empty on error
        }
    }
    
    navigateToCreateGroup = () => {
        this.props.history.push("/group/create");
    }

    renderList = (list, title) => {
        const { t } = this.props;
        if (!list || list.length === 0) return null;
        
        return (
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-3">{title}</h2>
                <ul className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden"> {/* Removed divide-y as GroupListItem handles its border */}
                    {list.map((item) => <GroupListItem data={item} key={item.id}/>)}
                </ul>
            </div>
        );
    }

    render() {
        const { t } = this.props;
        const { groups, mygroups } = this.state;

        const mainContent = (
            // blocklist equivalent: using space-y for vertical separation
            <div className="space-y-6">
                {/* createnotice whitebox equivalent */}
                <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg flex flex-wrap justify-between items-center">
                    {/* left equivalent */}
                    <div className="text-gray-700 dark:text-gray-300 mb-2 sm:mb-0">
                        {t("创建自己的栏目，分享价值并赚取ETH")}
                    </div>
                    {/* right equivalent */}
                    <div>
                        {/* wide equivalent: Button with text, hidden on small screens */}
                        <Button 
                            onClick={this.navigateToCreateGroup} 
                            icon="plus" 
                            large={true} 
                            minimal={true} 
                            text={t("创建")}
                            className="hidden sm:inline-flex" // Show on sm and up
                        />
                        {/* narrow equivalent: Icon-only button or smaller button, shown on small screens */}
                        <Button 
                            onClick={this.navigateToCreateGroup} 
                            icon="plus" 
                            large={true} // Or false for a smaller button
                            minimal={false} // Perhaps not minimal on small screens for better tap target
                            className="sm:hidden" // Show only on xs (default)
                            title={t("创建")} // Title for icon-only button
                        />
                    </div>
                </div>

                {this.renderList(mygroups, t("我的栏目"))}
                {this.renderList(groups, t("推荐栏目"))}
                
                {(!mygroups || mygroups.length === 0) && (!groups || groups.length === 0) && (
                     <div className="py-10 px-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400">{t("没有可显示的栏目。")}</p>
                    </div>
                )}
            </div>
        );

        return (
            <DocumentTitle title={t("栏目列表") + '@' + t(this.props.store.appname)}> {/* Changed title slightly for context */}
                <Column3Layout left={<UserCard/>} main={mainContent} />
            </DocumentTitle>
        );
    }
}
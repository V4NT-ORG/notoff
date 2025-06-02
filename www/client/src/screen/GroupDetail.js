import React, { Component, Fragment } from 'react';
import { observer , inject } from 'mobx-react';
// Link not directly used
import { withRouter } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import { toast , showApiError , inGroup, isApiOk } from '../util/Function';
import { Button, ButtonGroup, Intent, Spinner, NonIdealState } from "@blueprintjs/core"; // Callout removed
import BackButton from '../component/BackButton'; 

import Web3 from 'web3';

import Column3Layout from '../component/Column3Layout';
import GroupCard from '../component/GroupCard';
import BuyVipButton from '../component/BuyVipButton';
import FeedItem from '../component/FeedItem'; 
import ActivityLink from '../util/ActivityLink';
import VisibilitySensor from 'react-visibility-sensor';
import DocumentTitle from 'react-document-title';


@withTranslation()
@inject("store")
@withRouter
@observer
export default class GroupDetail extends Component
{
    state = {
        group: {},
        loaded: false,
        feeds: [],
        since_id: 0,
        loading: false,
        paid_feed_count: 0,
        topfeed: null, // Added topfeed to state
    };

    componentDidMount() {
        const groupId = this.props.match.params.id;
        if (groupId) {
            this.loadGroupInfo(groupId); 
            this.loadFeed(groupId, true, 0);
        } else {
            // Handle missing group ID, e.g., redirect or show error
            this.props.history.push("/groups"); // Example redirect
        }
    }

    async componentDidUpdate(prevProps) {
        const oldGroupId = prevProps.match.params.id;
        const newGroupId = this.props.match.params.id;
        const oldFilter = prevProps.match.params.filter;
        const newFilter = this.props.match.params.filter;

        if (newGroupId && oldGroupId !== newGroupId) {
            this.setState({ group: {}, loaded: false, feeds: [], since_id: 0, loading: false, topfeed: null, paid_feed_count: 0 });
            this.loadGroupInfo(newGroupId);
            this.loadFeed(newGroupId, true, 0);
        } else if (oldFilter !== newFilter && newGroupId) {
            this.setState({ feeds: [], since_id: 0, loading: false, topfeed: null }); // Keep paid_feed_count from groupInfo
            this.loadFeed(newGroupId, true, 0);
        }
    }
    
    getFilterFromPath = () => {
        const { filter } = this.props.match.params;
        if (filter === 'paid') return 'paid';
        if (filter === 'media') return 'media';
        return 'all';
    }

    loadFeed = async (groupId, clean = false, sid = null) => {
        if (this.state.loading && !clean) return;
        this.setState({ loading: true });

        const { t, store } = this.props;
        const since_id_to_load = sid === null ? this.state.since_id : sid;
        const currentFilter = this.getFilterFromPath();

        const { data } = await store.getGroupFeed(groupId, since_id_to_load, currentFilter);
        this.setState({ loading: false });

        if (isApiOk(data) && data.data) {
            let newFeeds = data.data.feeds && Array.isArray(data.data.feeds) ? data.data.feeds : [];
            const topFeedData = data.data.topfeed || null;
            
            if (topFeedData && newFeeds.length > 0) { // Ensure topfeed is not duplicated in feeds list
                newFeeds = newFeeds.filter(item => item.id !== topFeedData.id);
            }

            let next_since_id = this.state.since_id;
            if (data.data.minid != null) {
                next_since_id = parseInt(data.data.minid, 10);
            } else if (newFeeds.length === 0 && !clean) {
                next_since_id = 0; 
            }
            
            const combinedFeeds = clean ? newFeeds : [...(this.state.feeds || []), ...newFeeds];

            this.setState({
                feeds: combinedFeeds,
                topfeed: clean ? topFeedData : (this.state.topfeed || topFeedData), // Only update topfeed on clean load or if not set
                since_id: next_since_id,
                paid_feed_count: data.data.paid_feed_count !== undefined ? data.data.paid_feed_count : this.state.paid_feed_count,
            });  
        } else {
            if (clean) this.setState({ feeds: [], topfeed: null });
            showApiError(data, t);
        }
    }

    loadGroupInfo = async (groupId) => {
        const { t, store, history } = this.props;
        if (parseInt(groupId, 10) > 0) {
            const { data } = await store.getGroupDetail(groupId);
            if (!showApiError(data, t)) {
                if (parseInt(data.data.is_active, 10) === 0) {
                    toast(t("栏目不存在或已被关闭"));
                    history.push("/groups");
                    return;
                }
                this.setState({ group: data.data, loaded: true, paid_feed_count: data.data.paid_feed_count || 0 });
            } else {
                 history.push("/groups"); // Redirect if error loading group
            }  
        }
    }

    handleJoinGroup = async (groupId) => {
        const { t, store } = this.props;
        const { data: joinData } = await store.joinGroup(groupId);
        if (!showApiError(joinData, t)) {
            const { data: userInfoData } = await store.updateUserInfo();
            if (!showApiError(userInfoData, t)) {
                toast(t("您已成功订阅栏目"));
                this.loadGroupInfo(groupId); // Reload group info to reflect new member status potentially
                this.loadFeed(groupId, true, 0); // Refresh feeds
            }
        } 
    }

    handleQuitGroup = async (groupId) => {
        const { t, store } = this.props;
        if (window.confirm(t("确定要取消订阅吗？退出后VIP订户需要重新购买哦~😯"))) {
            const { data: quitData } = await store.quitGroup(groupId);
            if (!showApiError(quitData, t)) {
                const { data: userInfoData } = await store.updateUserInfo();
                if (!showApiError(userInfoData, t)) {
                    toast(t("您已成功取消订阅"));
                    this.loadGroupInfo(groupId);
                }
            } 
        }
    }

    handleVisibilityChange = (isVisible) => {
        const groupId = this.props.match.params.id;
        if (isVisible && this.state.since_id !== 0 && !this.state.loading && this.state.loaded && groupId) {
            this.loadFeed(groupId);
        }
    }

    navigateTo = (path) => this.props.history.push(path);

    render() {
        const { t, store, location } = this.props;
        const { group, loaded, feeds, topfeed, loading, since_id, paid_feed_count } = this.state;
        
        if (!loaded && loading && !group.id) { // Initial loading state for the whole page
            return (
                <div className="flex justify-center items-center h-screen">
                    <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                </div>
            );
        }
        if (!group.id && loaded) { // Group not found or error, and not loading anymore
             return (
                <div className="flex justify-center items-center h-screen">
                    <NonIdealState title={t("错误")} description={t("无法加载栏目信息。")} icon="error" />
                </div>
            );
        }


        const web3 = new Web3(Web3.givenProvider || "http://localhost:8545");
        const is_member = store.user.groups && inGroup(group.id, store.user.groups);
        const is_admin = store.user.admin_groups && inGroup(group.id, store.user.admin_groups);
        // const is_self = group && group.author_uid === store.user.id; // is_self not used in this render

        const pageTitle = (group.name || t("栏目详情")) + '@' + t(store.appname);

        const filterLinkBaseClasses = "py-2 px-4 text-sm font-medium text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
        const filterLinkActiveClasses = "text-white bg-blue-600 hover:bg-blue-700";
        const filterLinkInactiveClasses = "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";

        const mainContent = (
            <div className="space-y-4">
                <BackButton className="mb-4" />
                
                {loaded && (
                    <Fragment>
                        {topfeed && (
                            <ul className="border-2 border-yellow-400 dark:border-yellow-600 rounded-lg mb-4"> {/* Highlight top feed */}
                                <FeedItem data={topfeed} key={topfeed.id + "-top"} in_group={true} /> 
                            </ul>
                        )}

                        <div className="sticky top-16 bg-white dark:bg-gray-800 shadow-md z-10 p-2 rounded-lg">
                            <div className="flex justify-around items-center space-x-1">
                                <ActivityLink 
                                    label={t("全部")} 
                                    to={`/group/${group.id}`} 
                                    activeOnlyWhenExact={!this.props.match.params.filter}
                                    className={`${filterLinkBaseClasses} ${!this.props.match.params.filter ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                                />
                                <ActivityLink 
                                    label={t("付费")} 
                                    to={`/group/paid/${group.id}`} 
                                    className={`${filterLinkBaseClasses} ${this.props.match.params.filter === 'paid' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                                />
                                <ActivityLink 
                                    label={t("图片")} 
                                    to={`/group/media/${group.id}`} 
                                    className={`${filterLinkBaseClasses} ${this.props.match.params.filter === 'media' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                                />
                            </div>
                        </div>

                        {feeds && feeds.length > 0 ? (
                            <div>
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {feeds.map((item) => <FeedItem data={item} key={item.id} in_group={true}/>)}
                                </ul>
                                {loading && feeds.length > 0 && (
                                    <div className="flex justify-center py-4"><Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_SMALL} /></div>
                                )}
                                {since_id !== 0 && !loading && <VisibilitySensor onChange={this.handleVisibilityChange} partialVisibility={true} offset={{bottom: -200}}/>}
                            </div>
                        ) : (
                             !loading && (<div className="py-10 px-4"> <NonIdealState
                                visual="search"
                                title={<span className="text-gray-800 dark:text-gray-200">{t("还没有内容")}</span>}
                                description={<span className="text-gray-600 dark:text-gray-400">{t("没有符合条件的内容")}</span>}
                            /></div>)
                        )}
                        {/* Initial loading for feeds, if feeds is null and not yet loaded */}
                        {feeds === null && loading && (
                             <div className="flex justify-center py-10"><Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE}/></div>
                        )}
                    </Fragment>
                )}
            </div>
        );

        const leftColumnContent = loaded && group.id ? (
            <div className="space-y-4"> {/* Replaces px10list for spacing */}
                <GroupCard group={group}/> {/* Assumed refactored */}
                
                {/* groupactionbar equivalent */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 text-center">
                    {!is_member && (
                        // freenotice equivalent
                        <div className="space-y-2">
                            <Button text={t("免费订阅")} intent={Intent.PRIMARY} onClick={()=>this.handleJoinGroup(group.id)} large={true} fill={true} />
                            <p className="text-xs text-gray-500 dark:text-gray-400">{t("订阅后可在首页显示更新")}</p>
                        </div>
                    )}
                    {is_member && !is_admin && (
                        // membernotice equivalent
                        <div className="space-y-2">
                             <BuyVipButton group={group} className="bp3-large bp3-fill" text={t("购买VIP")+" · "+web3.utils.fromWei( group.price_wei ? group.price_wei.toString() : '0' , 'ether' )+'Ξ'} renewaltext={t("VIP订户 · 续费")}/>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {paid_feed_count > 0 ? t("VIP订户可以看到栏目中的"+ paid_feed_count +"篇付费内容") : t("VIP订户可以看到栏目中的付费内容")}
                            </p> 
                            <button onClick={()=>this.handleQuitGroup(group.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:underline focus:outline-none">
                                {t("取消订阅")}
                            </button>    
                        </div>
                    )}
                </div>

                {is_admin && (
                    // whitebox vcenter hcenter flexcol equivalent
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 flex flex-col items-center space-y-2">
                        <ButtonGroup large={false} minimal={false} vertical={false}>
                            <Button text={group.todo_count > 0 ? `${t("投稿")} · ${group.todo_count}` : t("投稿")} icon="inbox" intent={group.todo_count > 0 ? Intent.PRIMARY : Intent.NONE} onClick={()=>this.navigateTo('/group/contribute/todo')} /> 
                            <Button text={group.member_count > 0 ? group.member_count.toString() : undefined} icon="people" intent={Intent.NONE} onClick={()=>this.navigateTo('/group/member/'+group.id)}/>
                            <Button icon="cog" intent={Intent.NONE} onClick={()=>this.navigateTo('/group/settings/'+group.id)}/>
                        </ButtonGroup>
                    </div>
                )}
            </div>
        ) : (
             <div className="p-4 flex justify-center"><Spinner /></div> // Loading state for left column
        );

        return (
            <DocumentTitle title={pageTitle}>
                <Column3Layout left={leftColumnContent} main={mainContent} />
            </DocumentTitle>
        );
    }
}
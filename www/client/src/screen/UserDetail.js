import React, { Component,Fragment } from 'react';
import { observer , inject } from 'mobx-react';
// Link not directly used
import { withRouter } from 'react-router-dom';
import { withTranslation } from 'react-i18next';
import { Intent, Spinner, NonIdealState, ButtonGroup, Button } from "@blueprintjs/core";

import Column3Layout from '../component/Column3Layout';
import UserCard from '../component/UserCard';
import { isApiOk, showApiError, toInt } from '../util/Function';

import FeedItem from '../component/FeedItem'; 
import ActivityLink from '../util/ActivityLink';
import VisibilitySensor from 'react-visibility-sensor';
import DocumentTitle from 'react-document-title';
import BlacklistButton from '../component/BlacklistButton'; 


@withRouter
@withTranslation()
@inject("store")
@observer
export default class UserDetail extends Component
{
    state = {
        user: null,
        // loaded: false, // Using user !== null and feeds !== null as indicators of loaded state
        feeds: null, // Initialize feeds as null to distinguish from empty array after load
        loading: false,
        since_id: 0, // Initial since_id for first load
    };

    componentDidMount()
    {
        const userIdFromPath = this.props.match.params.id;
        if (!userIdFromPath && this.props.store.user.uid) { // Check if store.user.uid exists
            this.props.history.replace('/user/'+this.props.store.user.uid);
        } else if (userIdFromPath) {
            this.loadUserInfo(userIdFromPath); 
            this.loadUserFeed(userIdFromPath, true, 0); // Load initial batch of feeds
        }
    }

    async componentDidUpdate(prevProps) 
    {
        const oldUserId = prevProps.match.params.id;
        const newUserId = this.props.match.params.id;
        const oldFilter = prevProps.match.params.filter;
        const newFilter = this.props.match.params.filter;

        if (newUserId && oldUserId !== newUserId) {
            this.setState({ user: null, feeds: null, since_id: 0, loading: false }); // Reset state for new user
            this.loadUserInfo(newUserId);
            this.loadUserFeed(newUserId, true, 0);
        } else if (oldFilter !== newFilter && newUserId) {
            this.setState({ feeds: null, since_id: 0, loading: false }); // Reset feeds for new filter
            this.loadUserFeed(newUserId, true, 0);
        }
    }
    
    getFilterFromPath = () => {
        const { filter } = this.props.match.params;
        if (filter === 'paid') return 'paid';
        if (filter === 'media') return 'media';
        return 'all';
    }

    loadUserInfo = async (userId) => {
        const { t, store, history } = this.props;
        const { data } = await store.getUserDetail(userId);
        if (isApiOk(data)) {
            this.setState({ user: data.data });
        } else {
            showApiError(data, t);
            history.push('/');
        }
    }

    loadUserFeed = async (userId, clean = false, sid = null) => {
        if (this.state.loading && !clean) return;

        this.setState({ loading: true });
        const { t, store } = this.props;
        const since_id_to_load = sid === null ? this.state.since_id : sid;
        const currentFilter = this.getFilterFromPath();

        const { data } = await store.getUserFeed(userId, since_id_to_load, currentFilter);
        this.setState({ loading: false });

        if (isApiOk(data) && data.data) {
            const newFeeds = data.data.feeds && Array.isArray(data.data.feeds) ? data.data.feeds : [];
            let next_since_id = this.state.since_id; // Default to current if no minid
            
            if (data.data.minid != null) {
                next_since_id = parseInt(data.data.minid, 10);
            } else if (newFeeds.length === 0 && !clean) {
                next_since_id = 0; // No more items for this batch
            }
            
            const combinedFeeds = clean ? newFeeds : [...(this.state.feeds || []), ...newFeeds];
            
            this.setState({
                feeds: combinedFeeds,
                since_id: next_since_id,
            });
        } else {
            if (clean) this.setState({ feeds: [] }); // Set to empty array on error for a clean load
            showApiError(data, t);
        }
    }

    handleVisibilityChange = (isVisible) => {
        const currentUserId = this.props.match.params.id || this.props.store.user.uid;
        if (isVisible && this.state.since_id !== 0 && !this.state.loading && this.state.user && currentUserId) {
            this.loadUserFeed(currentUserId);
        }
    }

    handleIm = (userId) => { // Renamed from im to handleIm
        this.props.store.openIm(userId);
    }
    
    render()
    {
        const currentUserIdFromPath = this.props.match.params.id;
        const loggedInUserId = this.props.store.user.uid;
        const targetUserId = currentUserIdFromPath || loggedInUserId;
        
        if (!targetUserId && !this.state.user) { // If no target user can be determined and no user loaded (e.g. initial state with no ID)
             return (
                <div className="flex justify-center items-center h-screen">
                    <Spinner intent={Intent.PRIMARY} />
                </div>
            );
        }

        const is_me = toInt(targetUserId) === toInt(loggedInUserId); 
        const { t, location } = this.props;
        const { user, feeds, loading, since_id } = this.state;
        const currentPath = location.pathname;

        const title = (user && user.nickname) ? user.nickname + t("@"+this.props.store.appname) : t("用户详情") + t("@"+this.props.store.appname);

        const filterLinkBaseClasses = "py-2 px-4 text-sm font-medium text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
        const filterLinkActiveClasses = "text-white bg-blue-600 hover:bg-blue-700";
        const filterLinkInactiveClasses = "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";

        const mainContent = (
            // blocklist groupdetailbox equivalent: using space-y for vertical spacing
            <div className="space-y-4"> 
                {/* feedfilter equivalent */}
                <div className="sticky top-16 bg-white dark:bg-gray-800 shadow-md z-10 p-2 rounded-lg">
                    <div className="flex justify-around items-center space-x-1">
                        <ActivityLink 
                            label={t("全部")} 
                            to={`/user/${targetUserId}`} 
                            activeOnlyWhenExact={!this.props.match.params.filter} // Active if no filter param
                            className={`${filterLinkBaseClasses} ${!this.props.match.params.filter ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                        />
                        {is_me && ( // Only show "付费" to the user themselves, assuming it's their paid content
                            <ActivityLink 
                                label={t("付费")} 
                                to={`/user/${targetUserId}/paid`} 
                                className={`${filterLinkBaseClasses} ${this.props.match.params.filter === 'paid' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                            />
                        )}
                        <ActivityLink 
                            label={t("图片")} 
                            to={`/user/${targetUserId}/media`} 
                            className={`${filterLinkBaseClasses} ${this.props.match.params.filter === 'media' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                        />
                    </div>
                </div>

                {feeds === null && loading && ( // Initial load for feeds
                    <div className="flex justify-center items-center py-10">
                        <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                    </div>
                )}

                {feeds && feeds.length > 0 && (
                    <div>
                        <ul className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700">
                            {feeds.map( (item) => <FeedItem data={item} key={item.id}/> ) } 
                        </ul>
                        {loading && feeds.length > 0 && ( // Loading more spinner
                            <div className="flex justify-center items-center py-4">
                                <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_SMALL} />
                            </div>
                        )}
                        {since_id !== 0 && !loading && <VisibilitySensor onChange={this.handleVisibilityChange} partialVisibility={true} offset={{bottom: -200}}/>}
                    </div>
                )}

                {feeds && feeds.length === 0 && !loading && (
                     <div className="py-10 px-4">
                        <NonIdealState
                            visual="search"
                            title={<span className="text-gray-800 dark:text-gray-200">{t("还没有内容")}</span>}
                            description={<span className="text-gray-600 dark:text-gray-400">{t("没有符合条件的内容")}</span>}
                        />
                    </div>
                )}
            </div>
        );

        const leftColumnContent = user ? (
            <Fragment>
                <UserCard user={user}/> {/* UserCard is assumed to be refactored */}
                {!is_me && (
                    // blacklistbuttonbox hcenter equivalent
                    <div className="mt-4 flex justify-center"> 
                        <ButtonGroup>
                            <Button text={t("私信")} intent={Intent.PRIMARY} icon="chat" onClick={()=>this.handleIm(targetUserId)}/>
                            <BlacklistButton uid={targetUserId}/> {/* BlacklistButton is assumed to be styled or will be */}
                        </ButtonGroup>
                    </div>
                )}
            </Fragment>
        ) : (
            <div className="p-4 flex justify-center"><Spinner /></div> // Loading state for UserCard
        );
        
        return (
            <DocumentTitle title={title}>
                <Column3Layout left={leftColumnContent} main={mainContent} />
            </DocumentTitle>
        );
    }
}
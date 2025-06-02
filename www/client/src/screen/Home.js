import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { withRouter } from 'react-router-dom'; // Link removed, ActivityLink handles it
import { withTranslation } from 'react-i18next';

import { showApiError, isApiOk, toInt } from '../util/Function'; // Removed unused toast, inGroup
import { Button, Intent, Spinner, NonIdealState } from "@blueprintjs/core"; // Removed ButtonGroup, Callout

import Column3Layout from '../component/Column3Layout';
import UserCard from '../component/UserCard';
import PublishBox from '../component/PublishBox';
import FeedItem from '../component/FeedItem'; 
import ActivityLink from '../util/ActivityLink';
import VisibilitySensor from 'react-visibility-sensor';
import DocumentTitle from 'react-document-title';

@withTranslation()
@inject("store")
@withRouter
@observer
export default class Home extends Component
{
    state = {
        loaded: false,
        feeds: [],
        since_id: 0,
        loading: false,
        maxid: 0,
        show_has_new: false
    };

    componentDidMount()
    {
       this.loadFeed( true );
       this.checkInterval = setInterval( ()=>this.getLastId() , 1000*60 ); // Renamed for clarity
    }

    componentWillUnmount()
    {
        clearInterval( this.checkInterval ); // Use the named interval
    }
    
    async componentDidUpdate(prevProps) 
    {
        if (this.props.location !== prevProps.location) 
        {
            // Reset state for new location/filter
            this.setState({ feeds: [], since_id: 0, maxid: 0, loaded: false, show_has_new: false });
            await this.loadFeed( true , 0 );
        }
    }

    getFilterFromPath = () => {
        const { filter } = this.props.match.params;
        if (filter === 'paid') return 'paid';
        if (filter === 'media') return 'media';
        return 'all';
    }

    async getLastId()
    {
        const { t } = this.props;
        const currentFilter = this.getFilterFromPath();
        const { data } = await this.props.store.getTimelineLastId( currentFilter );
        
        if( isApiOk( data ) )
        {
            const lastid = toInt( data.data );
            if( lastid > this.state.maxid ) {
                this.setState({"show_has_new":true});
            } else {
                this.setState({"show_has_new":false});
            }
        } else {
            // Silently fail or log, showing API error for a background check might be too intrusive
            console.warn("Failed to get last ID:", data); 
        }
    }
    
    async loadFeed( clean = false , sid = null )
    {
        if (this.state.loading && !clean) return; // Prevent multiple loads if already loading more

        this.setState({ loading: true });
        const { t } = this.props;
        const since_id_to_load = sid === null ? this.state.since_id : sid;
        const currentFilter = this.getFilterFromPath();

        const { data } = await this.props.store.getHomeTimeline( since_id_to_load , currentFilter );
        
        // Always set loaded to true after first attempt, loading to false
        this.setState({loading: false, loaded: true, show_has_new: (clean ? false : this.state.show_has_new) });
        
        if( isApiOk( data ) && data.data )
        {
            const newFeeds = data.data.feeds && Array.isArray(data.data.feeds) ? data.data.feeds : [];
            let next_since_id = this.state.since_id;
            if (data.data.minid != null) {
                next_since_id = parseInt(data.data.minid, 10);
            } else if (newFeeds.length === 0 && !clean) { 
                // No more items from this since_id, prevent further loading for this batch by setting since_id to 0 (or specific marker)
                next_since_id = 0; 
            }


            let new_maxid = this.state.maxid;
            if (data.data.maxid != null && toInt(data.data.maxid) > new_maxid) {
                new_maxid = toInt(data.data.maxid);
            }
            
            const combinedFeeds = clean ? newFeeds : [...this.state.feeds, ...newFeeds];
            
            this.setState({
                feeds: combinedFeeds,
                since_id: next_since_id,
                maxid: new_maxid,
            });  
        }
        else {
            if (clean) this.setState({ feeds: [] }); // Clear feeds on error if it was a clean load
            showApiError( data , t );
        }
    }

    handleVisibilityChange = (isVisible) => {
        if (isVisible && this.state.since_id !== 0 && !this.state.loading && this.state.loaded) {
            // console.log("VisibilitySensor triggered loadFeed");
            this.loadFeed(); // Load more, not a clean load
        }
    }

    published = () => {
        this.getLastId(); // Check for new posts which might include the one just published
        this.props.store.updateUserInfo(); // Update user info (e.g., post count)
        // Optionally, could force a reload to show the new post at the top immediately:
        // this.reload(); 
    }

    reload = () => {
        this.setState({ show_has_new: false, since_id: 0, maxid: 0, feeds: [] }); // Reset before loading
        this.loadFeed( true , 0 );
    }

    render()
    {   
        const { t, location } = this.props;
        const { user } = this.props.store;
        const currentPath = location.pathname;

        const filterLinkBaseClasses = "py-2 px-4 text-sm font-medium text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
        const filterLinkActiveClasses = "text-white bg-blue-600 hover:bg-blue-700";
        const filterLinkInactiveClasses = "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";

        const mainContent = (
            // px10list equivalent: using padding on children or main container
            <div className="space-y-4"> 
                {user.group_count > 0 && <PublishBox groups={user.groups} onFinish={this.published}/>}

                {/* feedfilter sticky equivalent */}
                <div className="sticky top-16 bg-white dark:bg-gray-800 shadow-md z-10 p-2 rounded-lg">
                    <div className="flex justify-around items-center space-x-1">
                        <ActivityLink 
                            label={t("全部")} 
                            to={"/"} 
                            activeOnlyWhenExact={true}
                            className={`${filterLinkBaseClasses} ${currentPath === '/' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                        />
                        <ActivityLink 
                            label={t("付费")} 
                            to={"/home/paid/"} 
                            className={`${filterLinkBaseClasses} ${currentPath === '/home/paid/' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                        />
                        <ActivityLink 
                            label={t("图片")} 
                            to={"/home/media/"} 
                            className={`${filterLinkBaseClasses} ${currentPath === '/home/media/' ? filterLinkActiveClasses : filterLinkInactiveClasses}`}
                        />
                    </div>
                </div>

                {this.state.show_has_new && (
                    // hasnewfeed equivalent
                    <div 
                        className="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-4 py-3 rounded relative cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800" 
                        onClick={this.reload}
                    >
                        {t("有新的内容，点击查看")}
                    </div>
                )}

                {this.state.feeds.length > 0 ? (
                    <div>
                        {/* feedlist equivalent */}
                        <ul className="space-y-0 divide-y divide-gray-200 dark:divide-gray-700"> {/* Removed rounded-lg from here, FeedItem handles its bg */}
                            {this.state.feeds.map( (item) => <FeedItem data={item} key={item.id} /> ) } 
                        </ul>
                        {this.state.loading && !this.state.show_has_new && ( // Only show spinner if not showing "new content" banner
                            // hcenter equivalent
                            <div className="flex justify-center items-center py-4">
                                <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_SMALL} />
                            </div>
                        )}
                        {this.state.since_id !== 0 && <VisibilitySensor onChange={this.handleVisibilityChange} partialVisibility={true} offset={{bottom: -200}} />}
                    </div>
                ) : (
                    !this.state.loading && this.state.loaded && ( // Show NonIdealState only if not loading and initial load attempt finished
                        // padding40 equivalent for NonIdealState container
                        <div className="py-10 px-4"> {/* padding40 was likely p-10 */}
                             <NonIdealState
                                visual="search" // Blueprint visual
                                title={<span className="text-gray-800 dark:text-gray-200">{t("还没有内容")}</span>}
                                description={<span className="text-gray-600 dark:text-gray-400">{t("加入更多的栏目，就能看到更多的内容哦~")}</span>}
                                action={
                                    // top50 equivalent for button margin
                                    <div className="mt-12"> 
                                        <Button 
                                            icon="flame" 
                                            large={true} 
                                            intent={Intent.PRIMARY} // Keep intent for Blueprint styling
                                            onClick={()=>this.props.history.push("/group")} 
                                            text={t("查看热门栏目")}
                                            className="bg-blue-500 hover:bg-blue-600 text-white" // Example Tailwind if needed, but intent might be enough
                                        />
                                    </div>
                                }
                            />
                        </div>
                    )
                )}
                 {this.state.loading && this.state.feeds.length === 0 && ( // Initial loading spinner
                    <div className="flex justify-center items-center py-10">
                        <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                    </div>
                )}
            </div>
        );
        
        if (!this.state.loaded && !this.state.loading) { // Initial state before any load attempt or if initial load fails badly.
             return ( // Or a more specific initial loading screen
                <div className="flex justify-center items-center h-screen">
                    <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                </div>
            );
        }

        return (
            <DocumentTitle title={t("首页") + '@' + t(this.props.store.appname)}>
                <Column3Layout left={<UserCard/>} main={mainContent} />
            </DocumentTitle>
        );
    }
}
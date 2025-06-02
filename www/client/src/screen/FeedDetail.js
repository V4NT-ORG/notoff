import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link not used directly
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';

import Column3Layout from '../component/Column3Layout'; // Assumed refactored or handles its own styling
import DocumentTitle from 'react-document-title';
import { toast, isApiOk, showApiError } from '../util/Function';
import FeedItem from '../component/FeedItem'; // Assumed refactored
// Button from blueprint is not used directly
import BackButton from '../component/BackButton'; // Assumed refactored or handles its own styling
import { Spinner, Intent, NonIdealState } from "@blueprintjs/core"; // For loading/error states

@withRouter
@translate()
@inject("store")
@observer
export default class FeedDetail extends Component
{
    state = { feed: null, loading: true, error: null }; // Added loading and error states

    async componentDidMount() {
        const { t, store, history, match } = this.props;
        const id = match.params.id ? parseInt(match.params.id, 10) : 0;

        if (id < 1) {
            toast(t("无法获取内容ID，将转向到首页"));
            history.replace('/');
            return;
        }

        try {
            const { data } = await store.getFeedDetail(id);
            if (isApiOk(data)) {
                this.setState({ feed: data.data, loading: false });
            } else {
                showApiError(data, t); // showApiError might internally call toast
                this.setState({ error: data.message || t("加载内容失败"), loading: false });
                // Optionally redirect on error after showing message
                // history.push('/'); 
            }
        } catch (err) {
            console.error("Error fetching feed detail:", err);
            toast(t("加载内容时发生错误"));
            this.setState({ error: t("加载内容时发生网络错误"), loading: false });
            // Optionally redirect
            // history.push('/');
        }
    }
    
    render() {
        const { t, store } = this.props;
        const { feed, loading, error } = this.state;

        let mainContent;

        if (loading) {
            mainContent = (
                <div className="flex justify-center items-center py-20">
                    <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                </div>
            );
        } else if (error) {
            mainContent = (
                <div className="py-10 px-4">
                    <NonIdealState
                        icon="error"
                        title={<span className="text-red-600 dark:text-red-400">{t("加载失败")}</span>}
                        description={<span className="text-gray-600 dark:text-gray-400">{error}</span>}
                        action={<BackButton />}
                    />
                </div>
            );
        } else if (feed) {
            // feeddetail equivalent: Using padding and margin for spacing.
            // feedlist equivalent: The UL is kept for semantic structure if FeedItem is an LI, otherwise can be a div.
            // If FeedItem is a block-level element with its own bg/shadow, the UL might not need styling.
            mainContent = (
                <div className="p-2 md:p-4 space-y-4"> {/* feeddetail class replaced */}
                    <BackButton /> 
                    {/* The 'feedlist' class was likely for styling the list if FeedItem had no background.
                        If FeedItem is now a self-contained card (typical after Tailwind refactor),
                        the ul might not need specific styling other than perhaps margin/padding.
                        Given it's a single item, the UL could even be a simple div wrapper.
                    */}
                    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden"> {/* Wrapper for the single FeedItem to give it card appearance */}
                        <FeedItem data={feed} key={feed.id} show_comment={true} />
                    </div>
                </div>
            );
        } else {
            // Fallback if not loading, no error, but no feed (should ideally not happen if API logic is sound)
            mainContent = (
                 <div className="py-10 px-4">
                    <NonIdealState
                        icon="search"
                        title={<span className="text-gray-800 dark:text-gray-200">{t("内容未找到")}</span>}
                        description={<span className="text-gray-600 dark:text-gray-400">{t("无法找到指定的内容。")}</span>}
                        action={<BackButton />}
                    />
                </div>
            );
        }
        
        const pageTitle = feed ? (feed.text ? feed.text.substring(0,30) + "..." : t("内容详情")) + `@${t(store.appname)}` : t(store.appname);

        return (
            <DocumentTitle title={pageTitle}>
                <Column3Layout main={mainContent} />
            </DocumentTitle>
        );
    }
}
import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link not used directly
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';

import Column3Layout from '../component/Column3Layout'; // Assumed refactored
import UserCard from '../component/UserCard'; // Assumed refactored
import DocumentTitle from 'react-document-title';
import NoticeItem from '../component/NoticeItem'; // Assumed refactored
import { toInt, isApiOk, showApiError } from '../util/Function';
import VisibilitySensor from 'react-visibility-sensor';
import { Intent, Spinner, NonIdealState } from '@blueprintjs/core';


@withRouter
@translate()
@inject("store")
@observer
export default class Notice extends Component
{
    state = { 
        messages: [],
        loading: false,
        since_id: 0, // Should be 0 for initial load to fetch latest, or highest ID if API expects that
        total: 0,
        maxid: 0, // Keep track of maxid if needed for "new messages" indicator, though not used in render
        initialLoadDone: false, // To track if the first load attempt has completed
    };

    componentDidMount() {
        this.loadMessageGroupList(true, 0); // Initial load, clean, start from beginning (or highest ID)
    }

    loadMessageGroupList = async (clean = false, sid = null) => {
        if (this.state.loading && !clean) return;

        this.setState({ loading: true });
        const { t, store } = this.props;
        const since_id_to_load = sid === null ? this.state.since_id : sid;
        
        const { data } = await store.getMessageGroupList(since_id_to_load);
        
        this.setState({ loading: false, initialLoadDone: true });

        if (isApiOk(data) && data.data) {
            const newMessages = data.data.messages && Array.isArray(data.data.messages) ? data.data.messages : [];
            
            let next_since_id = this.state.since_id;
            if (data.data.minid != null) {
                next_since_id = parseInt(data.data.minid, 10);
            } else if (newMessages.length === 0 && !clean) {
                next_since_id = 0; // No more items for this batch if not a clean load
            }

            let new_maxid = this.state.maxid;
            if (data.data.maxid != null && toInt(data.data.maxid) > new_maxid) {
                new_maxid = toInt(data.data.maxid);
            }
            
            const combinedMessages = clean ? newMessages : [...this.state.messages, ...newMessages];

            this.setState({
                messages: combinedMessages,
                since_id: next_since_id,
                total: toInt(data.data.total),
                maxid: new_maxid,
            });
        } else {
            if (clean) this.setState({ messages: [] }); // Clear messages on error if it was a clean load
            showApiError(data, t);
        }
    }

    handleVisibilityChange = (isVisible) => { // Renamed from messageloading
        if (isVisible && this.state.since_id !== 0 && !this.state.loading && this.state.initialLoadDone) {
            this.loadMessageGroupList(); // Load more, not a clean load
        }
    }
    
    render() {
        const { t, store } = this.props;
        const { messages, loading, initialLoadDone, since_id } = this.state;

        let messageContent;
        if (!initialLoadDone && loading) { // Initial loading state
            messageContent = (
                <div className="flex justify-center items-center py-20">
                    <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_LARGE} />
                </div>
            );
        } else if (messages.length > 0) {
            messageContent = (
                <ul className="bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden"> {/* noticelist equivalent */}
                    {messages.map((item) => <NoticeItem key={item.id} data={item}/>)}
                </ul>
            );
        } else { // No messages, and initial load is done
            messageContent = (
                <div className="py-10 px-4"> {/* padding40 equivalent */}
                    <NonIdealState
                        visual="chat"
                        title={<span className="text-gray-800 dark:text-gray-200">{t("没有消息")}</span>}
                        description={<span className="text-gray-600 dark:text-gray-400">{t("消息箱里很安静")}</span>}
                    />
                </div>
            );
        }

        const mainContent = (
            // noticebox equivalent: using space-y for potential future elements, though only one main list/state now
            <div className="space-y-4"> 
                {messageContent}
                {loading && messages.length > 0 && ( // "Loading more" spinner
                    <div className="flex justify-center py-4"> {/* hcenter equivalent */}
                        <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_SMALL} />
                    </div>
                )}
                {/* VisibilitySensor should be outside the conditional rendering of messages if it's to trigger when list is short or empty but has more */}
                {since_id !== 0 && !loading && <VisibilitySensor onChange={this.handleVisibilityChange} partialVisibility={true} offset={{bottom: -200}}/>}
            </div>
        );

        return (
            <DocumentTitle title={t('消息')+'@'+t(store.appname)}>
                <Column3Layout left={<UserCard/>} main={mainContent}/>
            </DocumentTitle>
        );
    }
}
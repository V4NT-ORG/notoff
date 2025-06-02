import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import DocumentTitle from 'react-document-title';
import { Spinner, NonIdealState, Intent } from '@blueprintjs/core';

import Header from '../component/Header';
import FeedItem from '../component/FeedItem';
import Column3Layout from '../component/Column3Layout'; // Assuming a similar layout might be desired
import UserCard from '../component/UserCard'; // Optional: if you want to show user card on search page

@withRouter
@translate()
@inject("store")
@observer
export default class SearchResultsScreen extends Component {
    
    componentDidMount() {
        this.fetchResults();
    }

    componentDidUpdate(prevProps) {
        if (this.props.location.search !== prevProps.location.search) {
            this.fetchResults();
        }
    }

    fetchResults = () => {
        const params = new URLSearchParams(this.props.location.search);
        const query = params.get('q');
        const page = parseInt(params.get('page'), 10) || 1; // Basic pagination support

        if (query) {
            this.props.store.searchFeeds(query, page);
        } else {
            // Clear results if query is empty (e.g., navigating to /search without q)
            this.props.store.searchResults = [];
            this.props.store.searchQuery = "";
        }
    }

    render() {
        const { store, t } = this.props;
        const { searchResults, searchingFeeds, searchQuery } = store;

        const mainContent = (
            <div>
                <h1>{t('搜索结果: ')} "{searchQuery}"</h1>
                {searchingFeeds && <Spinner intent={Intent.PRIMARY} />}
                {!searchingFeeds && searchResults.length === 0 && searchQuery && (
                    <NonIdealState
                        icon="search"
                        title={t("没有找到结果")}
                        description={t("尝试使用其他关键词进行搜索。")}
                    />
                )}
                {!searchingFeeds && searchResults.length === 0 && !searchQuery && (
                     <NonIdealState
                        icon="search"
                        title={t("请输入搜索词")}
                        description={t("在顶部的搜索框中输入关键词以查找内容。")}
                    />
                )}
                {!searchingFeeds && searchResults.length > 0 && (
                    <ul className="feedlist">
                        {searchResults.map(item => (
                            <FeedItem key={item.id} data={item} />
                        ))}
                    </ul>
                )}
                {/* TODO: Add pagination controls if API and store support it further */}
            </div>
        );
        
        const pageTitle = searchQuery ? `${t('搜索结果: ')} "${searchQuery}"` : t('搜索');

        return (
            <DocumentTitle title={pageTitle + ' - ' + store.appname}>
                <div>
                    <Header />
                    <Column3Layout
                        main={mainContent}
                        left={ store.user.id > 0 ? <UserCard /> : null } // Show UserCard only if logged in
                        // rightSide={<div>{t('相关搜索或趋势')}</div>} // Optional right side content
                    />
                </div>
            </DocumentTitle>
        );
    }
}

import React, { Component, Fragment } from 'react'; // Fragment is used
import { observer , inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import Linkify from 'react-linkify';

import { Icon, Colors } from "@blueprintjs/core"; // Colors might be needed for Icon

import MyTime from '../component/MyTime'; 
import UserLink from '../component/UserLink'; 
import UserAvatar from '../component/UserAvatar'; // Assumed refactored
import { isApiOk, showApiError, toast } from '../util/Function';

@withRouter
@translate()
@inject("store")
@observer
export default class CommentItem extends Component
{
    state = { show: true }; // Initialize directly

    removeComment = async (id) => { // Converted to arrow function for `this` binding
        const { t, store, onRemove } = this.props;
        
        if (!window.confirm(t('确定要删除这条评论吗？'))) return false;

        const { data } = await store.removeFeedComment(id);
        if (isApiOk(data)) {
            toast(t("评论已成功删除"));
            this.setState({ show: false });
            if (onRemove) onRemove();
        } else {
            showApiError(data, t);
        }
    }
    
    render() {
        const { data: item, store, admin, t } = this.props; 
        
        if (!this.state.show || !item) {
            return null;
        }

        const currentUser = store.user;
        const can_delete = item.user.id === currentUser.id || (admin && admin === currentUser.id);

        // commentitem equivalent: flex layout, padding, bottom border (if part of a list)
        // The parent <ul> in FeedComments might handle divide-y or spacing.
        // Here, assuming this item might need its own bottom border if used in different contexts.
        return (
            <li className="py-3 px-2 flex space-x-3 items-start border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                {/* avatar equivalent */}
                <div className="flex-shrink-0">
                    <UserAvatar data={item.user} size="sm" /> {/* Assuming UserAvatar takes size prop */}
                </div>

                {/* content equivalent */}
                <div className="flex-grow min-w-0 relative"> {/* min-w-0 for truncation, relative for delete icon */}
                    {can_delete && (
                        // delete icon: absolute positioning
                        <div className="absolute top-0 right-0">
                            <Icon 
                                icon="small-cross" 
                                title={t("删除评论")} 
                                onClick={() => this.removeComment(item.id)}
                                className="cursor-pointer text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                                size={14} // Blueprint icon size prop
                            />
                        </div>
                    )}
                    
                    {/* User info and comment text */}
                    <div>
                        <UserLink data={item.user} className="text-sm font-semibold text-gray-800 dark:text-white hover:underline" />
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">@{item.user.username}</span>
                    </div>

                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {/* Linkify with Tailwind classes for links */}
                        <Linkify properties={{ target: '_blank', className: 'text-blue-500 hover:underline dark:text-blue-400' }}>
                            {item.text}
                        </Linkify>
                    </div>
                    
                    {/* timeline equivalent */}
                    <div className="mt-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                            <MyTime date={item.timeline} />
                        </span>
                    </div>
                </div>
            </li>
        );
    }
}
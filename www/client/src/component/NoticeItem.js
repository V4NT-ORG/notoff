import React, { Component, Fragment } from 'react';
import { observer , inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import UserAvatar from './UserAvatar'; // Assumed refactored
import UserLink from './UserLink';   // Assumed refactored
import Linkify from 'react-linkify';
import MyTime from './MyTime';       // Assumed refactored or styles independently
import { Colors, Icon, Button } from '@blueprintjs/core'; // Blueprint components
import { toInt } from '../util/Function';
import SystemNoticeAction from '../component/SystemNoticeAction'; // Specific component for system notices

@withRouter
@translate()
@inject("store")
@observer
export default class NoticeItem extends Component
{
    // Using props directly is often cleaner unless internal state mutation of notice data is needed.
    // For now, keeping state to align with original structure, but consider this for future refactors.
    state = { notice: null };

    componentDidMount() {
        if (this.props.data) {
            this.setState({ notice: this.props.data });
        }
    }
    
    // If props.data can change and the component should update, use componentDidUpdate:
    componentDidUpdate(prevProps) {
        if (this.props.data !== prevProps.data) {
            this.setState({ notice: this.props.data });
        }
    }

    handleOpenIm = (userId) => { // Renamed from imbox
        this.props.store.openIm(userId);
    }
    
    render() {
        const { t } = this.props;
        const item = this.state.notice;

        if (!item) {
            return null; // Or a loading placeholder if data fetching is async within this component
        }

        // Normalize from/to user data if uid is 0 (system messages etc.)
        const fromUser = item.from_uid === 0 ? { uid: 0, username: t('系统通知') } : item.from;
        const toUser = item.to_uid === 0 ? { uid: 0, username: t('系统') } : item.to; // Assuming item.to exists if from_uid is not 0

        const isSelfMessage = item.uid === item.from_uid;
        const otherUserId = isSelfMessage ? item.to_uid : item.from_uid;
        const isRead = toInt(item.is_read) === 1;

        const baseClasses = "p-3 flex items-start space-x-3 hover:bg-gray-100 dark:hover:bg-gray-700";
        const readStatusClasses = isRead ? "bg-white dark:bg-gray-800" : "bg-blue-50 dark:bg-blue-900/30 font-medium";
        const listItemClasses = `${baseClasses} ${readStatusClasses}`;

        const userDisplay = isSelfMessage ? toUser : fromUser;
        const messageIcon = isSelfMessage ? "double-chevron-left" : "double-chevron-right";
        const messageActionText = item.from_uid === 0 ? t("查看通知") : t("查看对话");

        return (
            <li className={listItemClasses}>
                {/* Avatar part */}
                {userDisplay.uid !== 0 && (
                    <div className="flex-shrink-0">
                        <UserAvatar data={userDisplay} size="md" /> {/* Assuming UserAvatar takes size prop */}
                    </div>
                )}
                {userDisplay.uid === 0 && ( // System notice avatar placeholder
                     <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-600 rounded-full">
                        <Icon icon="notifications" color={Colors.GRAY3} />
                    </div>
                )}

                {/* Content part */}
                <div className="flex-grow min-w-0">
                    <div className="flex items-baseline justify-between">
                        <div className="truncate">
                            <UserLink data={userDisplay} className="text-sm font-semibold text-gray-800 dark:text-white hover:underline" />
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                @{userDisplay.username} · <MyTime date={item.timeline}/>
                            </span>
                        </div>
                        {!isRead && userDisplay.uid !== 0 && ( // Unread dot for non-system, non-self messages
                            <Icon icon="dot" size={12} color={Colors.BLUE5} className="ml-1 flex-shrink-0" />
                        )}
                    </div>
                    
                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                        {item.from_uid !== 0 && ( // Regular user message
                            <div className="flex items-start">
                                <Icon icon={messageIcon} size={12} color={Colors.GRAY3} className="mr-1 mt-1 flex-shrink-0" />
                                <Linkify properties={{ target: '_blank', className: 'text-blue-500 hover:underline dark:text-blue-400' }}>{item.text}</Linkify>
                            </div>
                        )}
                        {item.from_uid === 0 && ( // System notice
                            // Assuming SystemNoticeAction is styled internally or will be refactored
                            <SystemNoticeAction data={JSON.parse(item.text)} /> 
                        )}
                    </div>
                </div>

                {/* Action part */}
                {otherUserId !== 0 && ( // Do not show "View Conversation" if the other party is system (uid 0)
                    <div className="ml-auto pl-2 flex-shrink-0 self-center">
                        <Button 
                            text={messageActionText} 
                            onClick={() => this.handleOpenIm(otherUserId)} 
                            minimal={true} 
                            small={true}
                            className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                        />
                    </div>
                )}
            </li>
        );
    }
}
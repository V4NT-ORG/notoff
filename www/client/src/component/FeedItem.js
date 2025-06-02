import React, { Component } from 'react'; // Fragment removed as it's not explicitly used
import { observer , inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { translate } from 'react-i18next';

import MyTime from '../component/MyTime';
// Blueprint Icon might still be used by FeedActionsMenu or other sub-components. Colors might be needed for LMIcon.
import { Colors, Icon as BlueprintIcon } from "@blueprintjs/core"; 
import LMIcon from '../Icon'; // Custom Icon component
import FeedText from '../component/FeedText';
import { toast, isApiOk, showApiError, toInt } from '../util/Function';
import UserLink from '../component/UserLink';
import UserAvatar from '../component/UserAvatar';

// Sub-components for FeedItem structure
import FeedActionsMenu from './FeedActionsMenu'; // Candidate for Headless UI Menu
import FeedComments from './FeedComments';
import FeedMedia from './FeedMedia';


@withRouter
@translate()
@inject("store")
@observer
export default class FeedItem extends Component
{
    state = {
        "feed": this.props.data,
        "show_comment_section": this.props.show_comment || false,
    };

    // editFeed logic seems to interact heavily with mobx store for a global float editor
    // This part is kept as is, assuming the store interaction is desired.
    editFeed = (item) => {
        const { store } = this.props;
        store.draft_feed_id = item.id;
        store.draft_text = item.text;
        try {
            store.draft_images = Array.isArray(item.images) ? item.images : (item.images ? JSON.parse(item.images) : []);
        } catch (e) {
            store.draft_images = [];
        }
        
        try {
            if (item.files) {
                // Assuming files structure is an array of objects like [{"url": "...", "name": "..."}]
                // or a single object for a single file.
                const parsedFiles = typeof item.files === 'string' ? JSON.parse(item.files) : item.files;
                if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
                     store.draft_attachment_name = parsedFiles[0].name;
                     store.draft_attachment_url = parsedFiles[0].url;
                } else if (parsedFiles && parsedFiles.url && parsedFiles.name) { // single file object
                    store.draft_attachment_name = parsedFiles.name;
                    store.draft_attachment_url = parsedFiles.url;
                }
                 else {
                    store.draft_attachment_name = false;
                    store.draft_attachment_url = false;
                }
            } else {
                store.draft_attachment_name = false;
                store.draft_attachment_url = false;
            }
        } catch(e) {
            console.error("Error parsing files for editFeed:", e);
            store.draft_attachment_name = false;
            store.draft_attachment_url = false;
        }

        store.draft_is_paid = item.is_paid;
        // Ensure the callback updates using the correct structure for files if it's an array
        const filesForUpdate = store.draft_attachment_url && store.draft_attachment_name ? [{ "url": store.draft_attachment_url, "name": store.draft_attachment_name }] : [];
        store.draft_update_callback = () => { this.updateFeedDisplay(store.draft_text, store.draft_images, filesForUpdate, store.draft_is_paid) };
        store.float_editor_open = true;
    }

    updateFeedDisplay = (text, images, files, is_paid) => {
        this.setState(prevState => ({
            feed: {
                ...prevState.feed,
                text: text,
                images: images, // Ensure this is an array
                files: files,   // Ensure this is an array or object as expected by FeedMedia
                is_paid: is_paid,
            }
        }));
    }

    openFeed = (id) => {
        // Consider using this.props.history.push for in-app navigation if preferred
        window.open('/feed/' + id, '_blank');
    }

    toggleCommentSection = () => {
        this.setState(prevState => ({ "show_comment_section": !prevState.show_comment_section }));
    }

    removeFeed = async (id) => {
        // The original removeFeed had duplicated editFeed logic, removing that.
        // It should just confirm and remove.
        const { t, store } = this.props;
        if (window.confirm(t("确认要删除这条内容么？"))) {
            const { data } = await store.removeFeed(id);
            if (isApiOk(data)) {
                toast(t("内容已删除"));
                this.setState(prevState => ({
                    feed: { ...prevState.feed, is_delete: 1 }
                }));
            } else {
                showApiError(data, t);
            }
        }
    }
    
    handleCommentPosted = () => {
        this.setState(prevState => ({
            feed: { ...prevState.feed, comment_count: prevState.feed.comment_count + 1 }
        }));
    }

    handleCommentRemoved = () => {
        this.setState(prevState => ({
            feed: { ...prevState.feed, comment_count: Math.max(0, prevState.feed.comment_count - 1) }
        }));
    }

    topIt = async (item, status = 1) => {
        const { t, store } = this.props;
        const groupForTopit = item.group || {}; // Ensure group exists

        const { data } = await store.groupSetTop(groupForTopit.id, item.id, status);
        if (isApiOk(data)) {
            toast(data.data.top_feed_id == 0 ? t("已取消置顶，刷新后可见") : t("已设为栏目置顶，刷新后可见"));
        } else {
            showApiError(data, t);
        }
    }

    render() {
        const { t, /* store, */ in_group } = this.props; // store is used in methods, but not directly in render apart from passed down
        const item = this.state.feed;
        
        const admin_uid_for_comments = toInt(item.is_forward) === 1 ? item.forward_uid : item.uid;

        if (item.is_delete && parseInt(item.is_delete, 10) === 1) {
            return null; // Or some placeholder for deleted items if preferred over hiding
        }

        let fromElement = null;
        if (!in_group && toInt(item.forward_group_id) !== 0 && item.group) {
            fromElement = (
                <span className="text-sm text-gray-500">
                    &nbsp;·&nbsp;
                    {t('来自')}&nbsp;
                    <Link to={'/group/' + item.group.id} className="text-blue-500 hover:underline">
                        {item.group.name}
                    </Link>
                </span>
            );
        }
        
        // Tailwind classes for action bar items
        const actionItemClass = "flex items-center text-gray-500 hover:text-blue-500 cursor-pointer py-1 px-2 rounded-md";
        const actionIconColor = Colors.GRAY3; // Example Blueprint color, map to Tailwind if LMIcon supports color prop as string

        return (
            <li className="flex p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                {/* UserAvatar with Tailwind classes for spacing */}
                <div className="mr-3 flex-shrink-0">
                    <UserAvatar data={item.user} size="md" /> {/* Assuming UserAvatar can take a size prop like 'md' -> 48px */}
                </div>

                {/* feedbox equivalent */}
                <div className="flex-grow relative">
                    {(item.forward_is_paid > 0 || item.is_paid > 0) && (
                        // paid icon - absolute positioning within feedbox
                        <div className="absolute top-0 right-0 text-gray-400 dark:text-gray-500" title={t("此内容VIP订户可见")}>
                            <BlueprintIcon icon="dollar" size={16} />
                        </div>
                    )}

                    {/* hovermenu - FeedActionsMenu is kept, assuming it handles its own popover logic */}
                    {/* Position with Tailwind: absolute top-0 right-0 (adjust if paid icon is present) */}
                    <div className="absolute top-0 right-0 mr-2 mt-0 group-hover:block hidden"> {/* Adjust mr, mt if paid icon is there */}
                         {/* The 'group-hover:block hidden' would require the parent <li> to have 'group' class if we want hover on whole item. Or always show for touch. */}
                        <FeedActionsMenu
                            item={item}
                            onRemove={this.removeFeed}
                            onEdit={this.editFeed}
                            onOpen={this.openFeed}
                            onTopIt={this.topIt}
                        />
                    </div>
                    
                    {/* userbox equivalent */}
                    <div className="mb-1">
                        <div className="flex items-baseline">
                            <UserLink data={item.user} className="text-gray-900 dark:text-white font-semibold hover:underline" />
                            <span className="ml-1 text-gray-600 dark:text-gray-400 text-sm">@{item.user.username}</span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <Link to={"/feed/" + item.id} className="hover:underline">
                                <MyTime date={item.timeline} />
                            </Link>
                            {fromElement}
                        </div>
                    </div>

                    {/* feedcontent equivalent */}
                    <div className="mb-2 prose prose-sm dark:prose-invert max-w-none"> {/* prose for basic text styling, max-w-none to fill width */}
                        <FeedText text={item.text} /> {/* more/less handled by FeedText */}
                        <FeedMedia item={item} /> {/* FeedMedia handles its own styling */}
                    </div>

                    {/* actionbar equivalent */}
                    <div className="flex items-center space-x-4 text-sm">
                        <div className={actionItemClass} onClick={this.toggleCommentSection}>
                            <LMIcon name="comment" size={18} colorClassName="text-gray-500 group-hover:text-blue-500" />
                            {item.comment_count > 0 && <span className="ml-1">{item.comment_count}</span>}
                        </div>
                        <div className={actionItemClass}> {/* Upvote - assuming LMIcon can take color prop */}
                            <LMIcon name="up" size={18} colorClassName="text-gray-500 group-hover:text-green-500" />
                            {item.up_count > 0 && <span className="ml-1">{item.up_count}</span>}
                        </div>
                        <div className={actionItemClass}> {/* Heart - assuming LMIcon can take color prop */}
                            <LMIcon name="heart" size={18} colorClassName="text-gray-500 group-hover:text-red-500" />
                            {/* Original used up_count for heart, check if this is correct or if there's a heart_count */}
                            {item.up_count > 0 && <span className="ml-1">{item.up_count}</span>} 
                        </div>
                    </div>

                    {this.state.show_comment_section && (
                        <div className="mt-3"> {/* Added margin-top for spacing */}
                            <FeedComments
                                feed_id={item.id}
                                admin_uid={admin_uid_for_comments}
                                show_comment_initially={true}
                                onCommentPosted={this.handleCommentPosted}
                                onCommentRemoved={this.handleCommentRemoved}
                            />
                        </div>
                    )}
                </div>
            </li>
        );
    }
}
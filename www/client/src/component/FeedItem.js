import React, { Component, Fragment } from 'react';
import { observer , inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { translate } from 'react-i18next';

import MyTime from '../component/MyTime';
import { Colors, Icon, Menu, MenuItem, MenuDivider, Popover, PopoverInteractionKind, Position, Button, TextArea } from "@blueprintjs/core"; // Removed InputGroup, AnchorButton
import LMIcon from '../Icon';
import FeedText from '../component/FeedText';
import { toast, isApiOk, showApiError, toInt } from '../util/Function';
import UserLink from '../component/UserLink';
import UserAvatar from '../component/UserAvatar';

// New components
import FeedActionsMenu from './FeedActionsMenu';
import FeedComments from './FeedComments';
import FeedMedia from './FeedMedia';



@withRouter
@translate()
@inject("store")
@observer
export default class FeedItem extends Component
{
    
    constructor(props) {
        super(props);

        // item.images and item.files parsing will be handled by FeedMedia or done here safely
        // For now, assume item is passed as is, and FeedMedia handles its internal parsing if needed.
        // The initial state for comments is now managed by FeedComments component.
        this.state = {
            "feed": this.props.data, // Keep a mutable copy if direct modifications are needed for feed properties like is_delete
            "show_comment_section": this.props.show_comment ? true : false, // To toggle visibility of the comment section
        };
    }

    // componentDidMount is no longer needed for initial comment loading here.
    // FeedComments will handle its own comment loading if show_comment_initially is true.

    editFeed = (item) => {
        const { store } = this.props;
        store.draft_feed_id = item.id;
        store.draft_text = item.text;
        // Images and files parsing should be robust if they come as strings
        try {
            store.draft_images = Array.isArray(item.images) ? item.images : (item.images ? JSON.parse(item.images) : []);
        } catch (e) {
            store.draft_images = [];
        }
        
        try {
            if (item.files) {
                const parsedFiles = JSON.parse(item.files);
                if (parsedFiles && parsedFiles.url && parsedFiles.name) { // single file object
                     store.draft_attachment_name = parsedFiles.name;
                     store.draft_attachment_url = parsedFiles.url;
                } else if (Array.isArray(parsedFiles) && parsedFiles.length > 0 && parsedFiles[0].url && parsedFiles[0].name) { // array of files
                    store.draft_attachment_name = parsedFiles[0].name;
                    store.draft_attachment_url = parsedFiles[0].url;
                } else {
                    store.draft_attachment_name = false;
                    store.draft_attachment_url = false;
                }
            } else {
                store.draft_attachment_name = false;
                store.draft_attachment_url = false;
            }
        } catch(e) {
            store.draft_attachment_name = false;
            store.draft_attachment_url = false;
        }

        store.draft_is_paid = item.is_paid;
        store.draft_update_callback = () => { this.updateFeedDisplay(store.draft_text, store.draft_images, [{ "url": store.draft_attachment_url, "name": store.draft_attachment_name }], store.draft_is_paid) };
        store.float_editor_open = true;
    }

    updateFeedDisplay = (text, images, files, is_paid) => {
        // This function updates the local state of the feed item after an edit.
        // The actual API call is handled by the store.
        let feed = { ...this.state.feed }; // Create a new object to avoid direct state mutation if feed comes from props directly
        feed.text = text;
        feed.images = images; // Assuming images is already in correct array format
        feed.files = files;   // Assuming files is already in correct array format
        feed.is_paid = is_paid;
        this.setState({ "feed": feed });
    }

    openFeed = (id) => {
        window.open('/feed/' + id);
    }

    toggleCommentSection = () => {
        this.setState(prevState => ({ "show_comment_section": !prevState.show_comment_section }));
    }

    removeFeed = async (id) => {
    {
        
        const { store } = this.props;
        store.draft_feed_id = item.id;
        store.draft_text = item.text;
        store.draft_images = Array.isArray(item.images) ? item.images : []  ;

        if( item.files && item.files[0] )
        {
            store.draft_attachment_name = item.files[0]['name'];
            store.draft_attachment_url = item.files[0]['url'];
        }
        store.draft_is_paid = item.is_paid;
        
        store.draft_update_callback = ()=>{this.update( store.draft_text , store.draft_images, [{"url":store.draft_attachment_url,"name":store.draft_attachment_name}]  , store.draft_is_paid )};
        
        store.float_editor_open = true;

        console.log( store.draft_images );
    }

        const { t, store } = this.props;
        if (window.confirm(t("确认要删除这条内容么？"))) {
            const { data } = await store.removeFeed(id);
            if (isApiOk(data)) {
                toast(t("内容已删除"));
                // Update the local state to reflect deletion
                this.setState(prevState => ({
                    feed: { ...prevState.feed, is_delete: 1 }
                }));
            } else {
                showApiError(data, t);
            }
        }
    }
    
    // This function is called by FeedComments when a comment is successfully posted.
    handleCommentPosted = () => {
        let feed = { ...this.state.feed };
        feed.comment_count++;
        this.setState({ feed: feed });
    }

    // This function is called by FeedComments when a comment is removed.
    handleCommentRemoved = () => {
        let feed = { ...this.state.feed };
        if (feed.comment_count > 0) {
            feed.comment_count--;
        }
        this.setState({ feed: feed });
    }


    topIt = async (item, status = 1) => {
    {
        const { t, store } = this.props;

        // Ensure item has a group property for topit logic
        const groupForTopit = item.group || {};


        const { data } = await store.groupSetTop(groupForTopit.id, item.id, status);
        if (isApiOk(data)) {
            if (data.data.top_feed_id == 0) {
                toast(t("已取消置顶，刷新后可见"));
            } else {
                toast(t("已设为栏目置顶，刷新后可见"));
            }
        } else {
            showApiError(data, t);
        }
    }

    render() {
        const { t, store, in_group } = this.props;
        const item = this.state.feed; // Use the local mutable copy
        
        // admin_uid is used by CommentItem, ensure it's correctly derived for FeedComments
        const admin_uid_for_comments = toInt(item.is_forward) === 1 ? item.forward_uid : item.uid;

        const hiddenclass = item.is_delete && parseInt(item.is_delete, 10) === 1 ? 'hiddenitem' : '';

        let from = toInt(item.forward_group_id) !== 0 && item.group ? (
            <span>
                &nbsp;·&nbsp;
                {t('来自')}&nbsp;<Link to={'/group/' + item.group.id} >{item.group.name} </Link>
            </span>
        ) : '';

        if (in_group) from = '';


        return (
            <li className={hiddenclass}>
                <UserAvatar data={item.user} className="avatarbox" />
                <div className="feedbox">
                    {(item.forward_is_paid > 0 || item.is_paid > 0) && (
                        <div className="paid">
                            <Icon icon="dollar" color={Colors.LIGHT_GRAY3} title={t("此内容VIP订户可见")} />
                        </div>
                    )}

                    <div className="hovermenu">
                        <FeedActionsMenu
                            item={item}
                            onRemove={this.removeFeed}
                            onEdit={this.editFeed}
                            onOpen={this.openFeed}
                            onTopIt={this.topIt}
                        />
                    </div>

                    <div className="userbox">
                        <div className="name"><UserLink data={item.user} /><span>@{item.user.username}</span></div>
                        <div className="time">
                            <Link to={"/feed/" + item.id}><MyTime date={item.timeline} /></Link>
                            {from}
                        </div>
                    </div>

                    <div className="feedcontent">
                        <FeedText text={item.text} more={t("显示更多")} less={<div className="top10">{t("↑收起")}</div>} />
                        <FeedMedia item={item} />
                    </div>

                    <div className="actionbar">
                        {/* Share button was commented out in original */}
                        <div className="comment" onClick={this.toggleCommentSection}>
                            <LMIcon name="comment" size={20} color={Colors.GRAY5} />{item.comment_count > 0 && <span>{item.comment_count}</span>}
                        </div>
                        <div className="up">
                            <LMIcon name="up" size={20} color={Colors.LIGHT_GRAY5} />{item.up_count > 0 && <span>{item.up_count}</span>}
                        </div>
                        <div className="heart">
                            <LMIcon name="heart" size={20} color={Colors.LIGHT_GRAY5} />{item.up_count > 0 && <span>{item.up_count}</span>}
                        </div>
                        {/* Open button was commented out in original */}
                    </div>

                    {this.state.show_comment_section && (
                        <FeedComments
                            feed_id={item.id}
                            admin_uid={admin_uid_for_comments}
                            show_comment_initially={true} // Load comments when section is shown
                            onCommentPosted={this.handleCommentPosted}
                            onCommentRemoved={this.handleCommentRemoved}
                        />
                    )}
                </div>
            </li>
        );
    }
}
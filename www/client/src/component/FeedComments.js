import React, { Component, Fragment } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { Button, TextArea, Intent, Spinner } from "@blueprintjs/core"; // Added Spinner, Intent
import CommentItem from '../component/CommentItem'; // Assumed refactored
import { toast, isApiOk, showApiError, toInt } from '../util/Function';

@withRouter
@translate()
@inject("store")
@observer
export default class FeedComments extends Component {
    state = {
        comment_text: '',
        comments: [],
        since_id: 0,
        total: 0,
        comments_per_feed: 0, // This might determine if "Load More" is shown or how many to fetch
        loading_comments: false,
        initial_load_done: false, // To track if initial load attempt has completed
    };

    componentDidMount() {
        if (this.props.show_comment_initially) {
            this.loadComments(true, 0); // clean load, from the beginning
        }
    }
    
    componentDidUpdate(prevProps) {
        // Reload comments if feed_id changes and it's meant to be shown initially
        if (this.props.feed_id !== prevProps.feed_id && this.props.show_comment_initially) {
            this.loadComments(true, 0);
        }
    }

    handleCommentChange = (e) => {
        this.setState({ comment_text: e.target.value });
    }

    loadComments = async (clean = false, sid = null) => {
        if (this.state.loading_comments && !clean) return;
        this.setState({ loading_comments: true });

        const { t, store, feed_id } = this.props;
        const since_id_to_load = clean ? 0 : (sid !== null ? sid : this.state.since_id);
        
        const { data } = await store.getFeedComments(feed_id, since_id_to_load);
        
        this.setState(prevState => ({
            loading_comments: false,
            initial_load_done: true, // Mark initial load as done after first attempt
            comments: clean ? (data.data?.comments || []) : [...prevState.comments, ...(data.data?.comments || [])],
            since_id: (data.data?.minid != null) ? parseInt(data.data.minid, 10) : ( (data.data?.comments || []).length > 0 ? prevState.since_id : 0), // Stop if minid is null and no new comments
            total: data.data?.total !== undefined ? parseInt(data.data.total, 10) : prevState.total,
            comments_per_feed: data.data?.comments_per_feed !== undefined ? parseInt(data.data.comments_per_feed, 10) : prevState.comments_per_feed,
        }), () => {
            if (!isApiOk(data)) {
                showApiError(data, t);
                if (clean) this.setState({ comments: [] }); // Clear on error for clean load
            }
        });
    }

    sendComment = async () => {
        const { t, store, feed_id, onCommentPosted } = this.props;
        if (this.state.comment_text.trim().length < 1) { // Added trim()
            toast(t("评论不能为空"));
            return false;
        }

        this.setState({ loading_comments: true });
        const { data } = await store.saveFeedComment(feed_id, this.state.comment_text);
        // New comment is usually added to the top, so a full clean reload might be desired
        // or prepend the new comment to the existing list if API returns it.
        // For simplicity, reloading all comments cleanly.
        await this.loadComments(true, 0); 
        // Set loading_comments to false after loadComments finishes (it sets it internally)
        // No need to set it here again unless loadComments isn't called.

        if (isApiOk(data)) {
            this.setState({ comment_text: '' }); // Clear input field
            toast(t("评论发布成功"));
            if (onCommentPosted) {
                onCommentPosted();
            }
        } else {
            showApiError(data, t);
            // If send failed, restore loading state if not handled by loadComments
            if(this.state.loading_comments) this.setState({loading_comments: false});
        }
    }
    
    handleCommentRemoved = () => {
        if (this.props.onCommentRemoved) {
            this.props.onCommentRemoved();
        }
        // The total count might change, so a reload could be beneficial.
        // Or, decrement total if not reloading all.
        this.setState(prevState => ({ total: Math.max(0, prevState.total -1) }));
        // CommentItem hides itself, so visual list updates.
    }

    render() {
        const { t, store, admin_uid } = this.props;
        const { comments, comment_text, total, loading_comments, initial_load_done } = this.state;
        
        const validAdminUid = typeof admin_uid === 'number' ? admin_uid : 0;
        const showLoadMore = comments.length < total && !loading_comments && this.state.since_id !== 0;

        return (
            // commentbox equivalent: using Tailwind for spacing and structure
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                {toInt(store.user.id) !== 0 && (
                    <Fragment>
                        {/* Comment input area */}
                        <div className="space-y-2">
                            <TextArea
                                fill={true} // Blueprint prop
                                value={comment_text}
                                placeholder={t("请在这里输入评论，最长200字")}
                                maxLength={200}
                                onChange={this.handleCommentChange}
                                disabled={loading_comments}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                             <div className="flex justify-end">
                                <Button 
                                    text={t("发送")} 
                                    onClick={this.sendComment} 
                                    loading={loading_comments && !this.state.comment_text} // Show button loading only if trying to send
                                    intent={Intent.PRIMARY} 
                                    className="bg-blue-500 hover:bg-blue-600 text-white" // Basic Tailwind for BP button
                                />
                            </div>
                        </div>
                    </Fragment>
                )}

                {/* Initial loading spinner for comments */}
                {!initial_load_done && loading_comments && (
                     <div className="flex justify-center py-4">
                        <Spinner intent={Intent.PRIMARY} />
                    </div>
                )}

                {/* List of comments */}
                {initial_load_done && comments && comments.length > 0 && (
                    // commentlist equivalent: ul with list-none if CommentItem is self-styled block
                    <ul className="list-none p-0 m-0 space-y-0"> {/* space-y-0 if CommentItem has its own border/padding */}
                        {comments.map((item) => (
                            <CommentItem data={item} key={item.id} admin={validAdminUid} onRemove={this.handleCommentRemoved} />
                        ))}
                    </ul>
                )}
                
                {/* No comments message */}
                 {initial_load_done && comments.length === 0 && !loading_comments && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">{t("还没有评论，快来抢沙发吧！")}</p>
                )}

                {/* Load More button/indicator */}
                {showLoadMore && (
                    <div 
                        className="text-center text-sm text-blue-500 dark:text-blue-400 hover:underline cursor-pointer py-3" // morelink equivalent
                        onClick={() => this.loadComments()}
                    >
                        {t("载入更多")} ({comments.length}/{total})
                    </div>
                )}
                {loading_comments && comments.length > 0 && ( // Spinner when loading more and comments are already shown
                    <div className="flex justify-center py-3"> {/* hcenter top10 equivalent */}
                        <Spinner intent={Intent.PRIMARY} size={Spinner.SIZE_SMALL}/>
                    </div>
                )}
            </div>
        );
    }
}

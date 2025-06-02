import React, { Component, Fragment } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { Button, TextArea } from "@blueprintjs/core";
import CommentItem from '../component/CommentItem';
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
        comments_per_feed: 0,
        loading_comments: false,
    };

    componentDidMount() {
        if (this.props.show_comment_initially) {
            this.loadComments();
        }
    }
    
    componentDidUpdate(prevProps) {
        if (this.props.feed_id !== prevProps.feed_id && this.props.show_comment_initially) {
            this.loadComments(true);
        }
    }


    handleCommentChange = (e) => {
        this.setState({ comment_text: e.target.value });
    }

    loadComments = async (clean = false) => {
        if (this.state.loading_comments && !clean) return;
        this.setState({loading_comments: true});

        const { t, store, feed_id } = this.props;
        const since_id_to_load = clean ? 0 : this.state.since_id;
        
        const { data } = await store.getFeedComments(feed_id, since_id_to_load);
        this.setState({loading_comments: false});

        if (isApiOk(data)) {
            if (data.data !== undefined) {
                if (!Array.isArray(data.data.comments)) data.data.comments = [];

                let since_id_new = null;
                if (data.data.minid != null) {
                    since_id_new = parseInt(data.data.minid, 10);
                }

                const new_comments_data = clean ? data.data.comments : [...this.state.comments, ...data.data.comments];
                
                this.setState({
                    comments: new_comments_data,
                    since_id: since_id_new === null && new_comments_data.length > 0 ? 0 : since_id_new, // if minid is null and we have comments, it means no more older comments
                    total: parseInt(data.data.total, 10),
                    comments_per_feed: parseInt(data.data.comments_per_feed, 10)
                });
            }
        } else {
            showApiError(data, t);
        }
    }

    sendComment = async () => {
        const { t, store, feed_id } = this.props;
        if (this.state.comment_text.length < 1) {
            toast(t("评论不能为空"));
            return false;
        }

        this.setState({loading_comments: true}); // Indicate activity
        const { data } = await store.saveFeedComment(feed_id, this.state.comment_text);
        this.setState({loading_comments: false});


        if (isApiOk(data)) {
            this.setState({ comment_text: '' });
            toast(t("评论发布成功"));
            if (this.props.onCommentPosted) {
                this.props.onCommentPosted();
            }
            // Reload comments only if currently displayed comments are less than a page, or if it's the first comment.
            if (this.state.comments.length < this.state.comments_per_feed || this.state.comments.length === 0) {
                this.loadComments(true);
            }
        } else {
            showApiError(data, t);
        }
    }
    
    handleCommentRemoved = () => {
        if (this.props.onCommentRemoved) {
            this.props.onCommentRemoved();
        }
        // Optionally, reload comments to ensure consistency, though CommentItem handles its own removal from view.
        // this.loadComments(true); 
    }


    render() {
        const { t, store, admin_uid } = this.props;
        const { comments, comment_text, total, loading_comments } = this.state;
        
        // Ensure admin_uid is a number, default to 0 if not provided or invalid
        const validAdminUid = typeof admin_uid === 'number' ? admin_uid : 0;

        return (
            <div className="commentbox">
                {toInt(store.user.id) !== 0 && (
                    <Fragment>
                        <div>
                            <TextArea
                                className="pt-fill"
                                value={comment_text}
                                placeholder={t("请在这里输入评论，最长200字")}
                                maxLength={200}
                                onChange={this.handleCommentChange}
                                disabled={loading_comments}
                            />
                        </div>
                        <div>
                            <Button text={t("发送")} onClick={this.sendComment} loading={loading_comments} intent="primary" />
                        </div>
                    </Fragment>
                )}
                {comments && comments.length > 0 && (
                    <ul className="commentlist">
                        {comments.map((item) => (
                            <CommentItem data={item} key={item.id} admin={validAdminUid} onRemove={this.handleCommentRemoved} />
                        ))}
                    </ul>
                )}
                {comments.length < total && !loading_comments && (
                    <div className="morelink" onClick={() => this.loadComments()}>
                        {t("载入更多")}
                    </div>
                )}
                 {loading_comments && comments.length > 0 && <div className="hcenter top10"><Button minimal={true} loading={true}/></div>}
            </div>
        );
    }
}

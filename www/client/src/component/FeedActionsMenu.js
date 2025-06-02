import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { Menu, MenuItem, MenuDivider, Popover, Position, PopoverInteractionKind, Icon } from "@blueprintjs/core";
import { toast, isApiOk, showApiError, toInt } from '../util/Function';

@withRouter
@translate()
@inject("store")
@observer
export default class FeedActionsMenu extends Component {
    render() {
        const { t, item, store } = this.props;

        // Simplified logic will be moved here
        const menu_delete = <MenuItem icon="cross" text={t("删除")} onClick={() => this.props.onRemove(item.id)} />;
        const menu_edit = <MenuItem icon="edit" text={t("编辑")} onClick={() => this.props.onEdit(item)} />;
        const menu_open = <MenuItem icon="document-open" text={t("查看")} onClick={() => this.props.onOpen(item.id)} />;
        
        let actionMenuContent = <Menu>{menu_open}</Menu>; // Default

        // Determine menu items based on props (item, store.user, etc.)
        // This logic will be expanded based on FeedItem's original logic

        const isOwner = toInt(item.uid) === toInt(store.user.id);
        const isForwarder = toInt(item.forward_uid) === toInt(store.user.id);
        const isGroupAdmin = item.group && item.group.id && store.user.admin_groups && store.user.admin_groups.some(g => g.id === item.group.id);


        if (toInt(item.is_forward) === 1) { // Forwarded item
            if (isForwarder) { // Current user is the one who forwarded (group owner/admin)
                 if (isOwner) { // Forwarder is also the original author
                    actionMenuContent = <Menu>{menu_delete}{menu_edit}{isGroupAdmin && item.group && <MenuItem icon={item.id === item.group.top_feed_id ? "arrow-down" : "arrow-up"} text={t(item.id === item.group.top_feed_id ? "取消置顶" : "置顶")} onClick={() => this.props.onTopIt(item, item.id === item.group.top_feed_id ? 0 : 1)} /> }<MenuDivider />{menu_open}</Menu>;
                 } else { // Forwarder is not the original author (forwarded a contribution)
                    actionMenuContent = <Menu>{menu_delete}{isGroupAdmin && item.group && <MenuItem icon={item.id === item.group.top_feed_id ? "arrow-down" : "arrow-up"} text={t(item.id === item.group.top_feed_id ? "取消置顶" : "置顶")} onClick={() => this.props.onTopIt(item, item.id === item.group.top_feed_id ? 0 : 1)} /> }<MenuDivider />{menu_open}</Menu>;
                 }
            } else { // Current user is a regular user viewing a forwarded item
                actionMenuContent = <Menu>{menu_open}</Menu>;
            }
        } else { // Original item (not forwarded)
            if (isOwner) { // Current user is the author
                 actionMenuContent = <Menu>{menu_delete}{menu_edit}{isGroupAdmin && item.group && <MenuItem icon={item.id === item.group.top_feed_id ? "arrow-down" : "arrow-up"} text={t(item.id === item.group.top_feed_id ? "取消置顶" : "置顶")} onClick={() => this.props.onTopIt(item, item.id === item.group.top_feed_id ? 0 : 1)} /> }<MenuDivider />{menu_open}</Menu>;
            } else { // Current user is a regular user viewing an original item
                 actionMenuContent = <Menu>{menu_open}</Menu>;
            }
        }


        return (
            <Popover content={actionMenuContent} position={Position.BOTTOM} interactionKind={PopoverInteractionKind.CLICK}>
                <Icon icon="chevron-down" title={t("更多操作")} />
            </Popover>
        );
    }
}

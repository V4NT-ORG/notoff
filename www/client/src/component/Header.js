import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';

import ActivityLink from '../util/ActivityLink';
import { Button, AnchorButton, InputGroup, Position, Tooltip } from "@blueprintjs/core"; // Added InputGroup, Position, Tooltip

import LangIcon from './LangIcon';
import UserMenu from './UserMenu';
import UserAvatar from './UserAvatar';
import { toInt, isApiOk } from '../util/Function';
import Icon from '../Icon';

@translate()
@inject("store")
@withRouter
@observer
export default class Header extends Component
{
    state = {"unread":0, "searchTerm": ""}
    
    handleSearchChange = (event) => {
        this.setState({ searchTerm: event.target.value });
    }

    handleSearchSubmit = (event) => {
        if (event.key === 'Enter' || event.type === 'click') {
            event.preventDefault();
            const { searchTerm } = this.state;
            if (searchTerm.trim() !== '') {
                this.props.history.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
                // Optionally clear search term after submission
                // this.setState({ searchTerm: "" }); 
            }
        }
    }

    componentDidMount()
    {
        this.loadUnread();
    }

    async loadUnread()
    {
        const { data } = await this.props.store.getUnreadCount();
        if( isApiOk( data ) )
        {
            const unread = toInt( data.data );
            if( toInt( unread ) != toInt( this.state.unread ) )
            {
                this.setState( {"unread":unread} );
            }
        }
    }
    
    render()
    {
        const { appname , new_notice_count  } = this.props.store;
        const { t } = this.props;
        const { user } = this.props.store;
        const unread =this.state.unread;

        // console.log( user );

        return <div className="header-box">
            <div className="header">
                <div className="middle">
                    <div className="left">
                        <div className="logo">{appname}</div>
                        <div className="links">
                            <ul className="in-line">
                                <li className="link-text">
                                    <ActivityLink label={t("首页")} to="/" activeOnlyWhenExact={true}/>
                                </li>

                                <li className="link-text">
                                    <ActivityLink label={t("栏目")} to="/group" />
                                </li>

                                { toInt(user.id) !== 0 && <li className="link-text">
                                    { unread > 0  && <ActivityLink label={t("消息")} icon="chat" to="/notice" />}

                                    { unread < 1  && <ActivityLink label={t("消息")}  to="/notice" />}
                                    
                                </li> }

                                {/* icon version for small screen */}
                                {/* <li className="link-icon">
                                    <Icon name="logo" size={20} color="black" />
                                </li> */}

                                <li className="link-icon">
                                    <ActivityLink icon="home" to="/" activeOnlyWhenExact={true}/>
                                    
                                </li>

                                <li className="link-icon">
                                    <ActivityLink icon="ring" to="/group" />
                                </li>

                                { toInt(user.id) !== 0 && <li className="link-icon">
                                    { unread > 0 ? <ActivityLink  icon="chat" to="/notice"   /> : <ActivityLink icon="chat" color="#eee"  to="/notice" /> }
                                    
                                </li> }
                                
                            </ul>
                        </div>
                    </div>
                    
                    <div className="right">
                        <div className="search-bar-wrapper">
                             <InputGroup
                                className="search-input"
                                leftIcon="search"
                                placeholder={t("搜索内容...")}
                                value={this.state.searchTerm}
                                onChange={this.handleSearchChange}
                                onKeyPress={this.handleSearchSubmit}
                                round={true}
                                large={false} // Make it slightly smaller to fit header
                                rightElement={
                                    this.state.searchTerm ? 
                                    <Button icon="arrow-right" minimal={true} onClick={this.handleSearchSubmit} /> : undefined
                                }
                            />
                        </div>

                        { toInt(user.id) !== 0 && 
                        <div className="userbox">
                            <UserAvatar data={user} className="avatar"/>
                            <UserMenu />
                            <LangIcon className="left5"/>
                            { this.props.store.user.group_count > 0 && 
                                <Tooltip content={t("发布内容")} position={Position.BOTTOM}>
                                    <Button className="pointer left5" icon="edit" minimal={true} onClick={()=>this.props.store.float_editor_open = !this.props.store.float_editor_open} />
                                </Tooltip>
                            }
                        </div> } 
                    </div>
                </div>
            </div>
        </div>;
    }
}
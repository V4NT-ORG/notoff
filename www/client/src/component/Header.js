import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// import { Link } from "react-router-dom"; // ActivityLink handles Link
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';

import ActivityLink from '../util/ActivityLink';
import { Button, InputGroup, Position, Tooltip } from "@blueprintjs/core"; // Removed AnchorButton as it's not used directly

import LangIcon from './LangIcon';
import UserMenu from './UserMenu'; // Candidate for Headless UI Menu
import UserAvatar from './UserAvatar';
import { toInt, isApiOk } from '../util/Function';
// import Icon from '../Icon'; // Icon component usage seems to be within ActivityLink or not present directly

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
            }
        }
    }

    componentDidMount()
    {
        this.loadUnread();
    }

    async loadUnread()
    {
        // Assuming store.getUnreadCount is an async function
        const { data } = await this.props.store.getUnreadCount();
        if( isApiOk( data ) )
        {
            const unreadCount = toInt( data.data );
            if( unreadCount !== this.state.unread )
            {
                this.setState( {"unread": unreadCount} );
            }
        }
    }
    
    render()
    {
        const { appname } = this.props.store;
        const { t } = this.props;
        const { user } = this.props.store;
        const { unread, searchTerm } = this.state;

        const commonLinkClasses = "px-3 py-2 rounded-md text-sm font-medium";
        const activeLinkClasses = "bg-gray-900 text-white";
        const inactiveLinkClasses = "text-gray-300 hover:bg-gray-700 hover:text-white";
        
        // Use this.props.location.pathname for active state checking with ActivityLink
        const currentPath = this.props.location.pathname;

        return (
            // header-box equivalent
            <div className="bg-gray-800 shadow-md fixed top-0 left-0 right-0 z-50">
                {/* header equivalent */}
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    {/* middle equivalent */}
                    <div className="relative flex items-center justify-between h-16">
                        {/* left equivalent */}
                        <div className="flex-1 flex items-center justify-start">
                            {/* logo equivalent */}
                            <div className="flex-shrink-0">
                                <span className="text-white text-xl font-bold">{appname}</span>
                            </div>
                            {/* links equivalent */}
                            <div className="hidden sm:block sm:ml-6">
                                <ul className="flex space-x-4">
                                    {/* link-text equivalent, hidden on small screens */}
                                    <li>
                                        <ActivityLink 
                                            to="/" 
                                            activeOnlyWhenExact={true} 
                                            label={t("首页")} 
                                            className={`${commonLinkClasses} ${currentPath === '/' ? activeLinkClasses : inactiveLinkClasses}`}
                                        />
                                    </li>
                                    <li>
                                        <ActivityLink 
                                            to="/group" 
                                            label={t("栏目")} 
                                            className={`${commonLinkClasses} ${currentPath.startsWith('/group') ? activeLinkClasses : inactiveLinkClasses}`}
                                        />
                                    </li>
                                    {toInt(user.id) !== 0 && (
                                        <li>
                                            <ActivityLink 
                                                to="/notice" 
                                                label={t("消息")} 
                                                icon={unread > 0 ? "chat" : undefined} // Assuming ActivityLink can handle an icon prop or shows it internally
                                                className={`${commonLinkClasses} ${currentPath.startsWith('/notice') ? activeLinkClasses : inactiveLinkClasses} ${unread > 0 ? 'text-yellow-400' : ''}`}
                                            />
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </div>
                        
                        {/* right equivalent */}
                        <div className="flex items-center">
                            {/* search-bar-wrapper equivalent */}
                            <div className="mr-3">
                                 <InputGroup
                                    className="search-input text-xs sm:text-sm" // Keep blueprint class for base styling, add tailwind for responsiveness
                                    leftIcon="search"
                                    placeholder={t("搜索内容...")}
                                    value={searchTerm}
                                    onChange={this.handleSearchChange}
                                    onKeyPress={this.handleSearchSubmit}
                                    round={true}
                                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)'}} // Minimal styling for dark header
                                    rightElement={
                                        searchTerm ? 
                                        <Button icon="arrow-right" minimal={true} style={{color: 'white'}} onClick={this.handleSearchSubmit} /> : undefined
                                    }
                                />
                            </div>

                            {toInt(user.id) !== 0 ? (
                                // userbox equivalent
                                <div className="flex items-center space-x-3">
                                    <UserAvatar data={user} size="sm" /> {/* Assuming UserAvatar can take a size prop */}
                                    <UserMenu /> {/* This would be a Headless UI Menu */}
                                    <LangIcon />
                                    {this.props.store.user.group_count > 0 && (
                                        <Tooltip content={t("发布内容")} position={Position.BOTTOM}>
                                            <Button 
                                                icon="edit" 
                                                minimal={true} 
                                                className="text-gray-300 hover:text-white" 
                                                onClick={() => this.props.store.float_editor_open = !this.props.store.float_editor_open} 
                                            />
                                        </Tooltip>
                                    )}
                                </div>
                            ) : (
                                <div className="flex space-x-2">
                                   <ActivityLink to="/login" label={t('登录')} className={`${commonLinkClasses} ${inactiveLinkClasses}`} />
                                   <ActivityLink to="/register" label={t('注册')} className={`${commonLinkClasses} ${inactiveLinkClasses}`} />
                                </div>
                            )}
                        </div>

                        {/* Mobile menu button (placeholder, real implementation would use Headless UI Disclosure or Menu) */}
                        <div className="absolute inset-y-0 right-0 flex items-center sm:hidden">
                            <button type="button" className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-controls="mobile-menu" aria-expanded="false">
                                <span className="sr-only">Open main menu</span>
                                {/* Icon when menu is closed. Heroicon name: menu */}
                                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                                {/* Icon when menu is open. Heroicon name: x */}
                                <svg className="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu, show/hide based on menu state (placeholder, real implementation would use Headless UI Disclosure.Panel or Menu.Items) */}
                <div className="sm:hidden" id="mobile-menu">
                    <ul className="px-2 pt-2 pb-3 space-y-1">
                        <li>
                            <ActivityLink 
                                to="/" 
                                activeOnlyWhenExact={true} 
                                label={t("首页")} 
                                className={`${commonLinkClasses} block ${currentPath === '/' ? activeLinkClasses : inactiveLinkClasses}`}
                            />
                        </li>
                        <li>
                            <ActivityLink 
                                to="/group" 
                                label={t("栏目")} 
                                className={`${commonLinkClasses} block ${currentPath.startsWith('/group') ? activeLinkClasses : inactiveLinkClasses}`}
                            />
                        </li>
                        {toInt(user.id) !== 0 && (
                            <li>
                                <ActivityLink 
                                    to="/notice" 
                                    label={t("消息")} 
                                    icon={unread > 0 ? "chat" : undefined}
                                    className={`${commonLinkClasses} block ${currentPath.startsWith('/notice') ? activeLinkClasses : inactiveLinkClasses} ${unread > 0 ? 'text-yellow-400' : ''}`}
                                />
                            </li>
                        )}
                         {toInt(user.id) === 0 && (
                            <>
                                <li><ActivityLink to="/login" label={t('登录')} className={`${commonLinkClasses} block ${inactiveLinkClasses}`} /></li>
                                <li><ActivityLink to="/register" label={t('注册')} className={`${commonLinkClasses} block ${inactiveLinkClasses}`} /></li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        );
    }
}
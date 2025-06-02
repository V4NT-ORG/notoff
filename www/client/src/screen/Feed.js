import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { Link, withRouter } from "react-router-dom"; // Added Link
import { Popover, PopoverInteractionKind, Position, Icon, TextArea, Button, Intent, Colors, Switch } from "@blueprintjs/core"; // Tooltip, Menu, MenuItem removed as not directly used

import ActivityLink from '../util/ActivityLink';
import { handeleBooleanGlobal } from '../util/Function'; // Assuming this handles global state changes for mobx store
import TimeAgo from 'react-timeago';
import cnStrings from 'react-timeago/lib/language-strings/zh-CN';
import buildFormatter from 'react-timeago/lib/formatters/buildFormatter';

import LMIcon from '../Icon'; // Assuming LMIcon is updated for colorClassName
// import LangIcon from '../component/LangIcon'; // Not used in this render
import Header from '../component/Header'; // Assumed refactored
import UserCard from '../component/UserCard'; // Assumed refactored
import { withTranslation, Trans } from 'react-i18next';
import Column3Layout from '../component/Column3Layout'; // Import Column3Layout

@withRouter
@withTranslation()
@inject("store")
@observer
export default class Feed extends Component
{
    // componentWillMount is deprecated. Use componentDidMount or constructor for initialization.
    constructor(props) {
        super(props);
        if (!props.store.user.token || props.store.user.token.length < 32) {
            props.history.replace('/login');
        }
        // console.log(props.store.user); // Logging in constructor or componentDidMount
    }
    
    // Dummy handler for Popover content, replace with actual group selection logic
    renderGroupSelectMenu = () => {
        const { t } = this.props;
        // This should ideally render a list of groups from store or props
        return (
            <div className="p-2 bg-white dark:bg-gray-700 shadow-lg rounded-md">
                <p className="text-xs text-gray-600 dark:text-gray-300">{t("栏目选择功能待实现")}</p>
                {/* Example: <MenuItem text="Group 1" onClick={...} /> */}
            </div>
        );
    }

    render()
    {
        const { t } = this.props; // Moved t destructuring here
        const { hot_groups , draft_viponly, new_feed_count, my_feeds  } = this.props.store; // appname, new_notice_count not used

        const formatter = buildFormatter(cnStrings);
        // let i = 0; // 'i' for key was problematic, use item.id or unique photo/file id

        const filterLinkBaseClasses = "py-2 px-4 text-sm font-medium text-center rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500";
        const filterLinkActiveClasses = "text-white bg-blue-600 hover:bg-blue-700";
        const filterLinkInactiveClasses = "text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600";
        const currentPath = this.props.location.pathname; // For active link styling

        const leftSideContent = (
            <div className="space-y-4">
                <UserCard />
                {/* Placeholder for group list if needed in left sidebar */}
                {/* <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{t("我的栏目")}</h3>
                     Empty or list user's groups 
                </div> */}
            </div>
        );

        const mainContent = (
            <div className="space-y-6">
                {/* PublishBox simplified inline version */}
                <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg space-y-3">
                    <TextArea 
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" 
                        placeholder={t("今天有什么好东西分享到栏目？")}
                        // value={store.draft_text} onChange={(e)=>handeleStringGlobal(e, 'draft_text')} // Assuming draft_text is in store
                        fill={true}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                            <Icon icon="media" size={20} color={Colors.GRAY4} className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400" title={t("上传图片")} />
                            {draft_viponly && <Icon icon="paperclip" size={20} color={Colors.GRAY4} className="cursor-pointer hover:text-blue-500 dark:hover:text-blue-400" title={t("上传附件")} />}
                        </div>
                        <div className="flex items-center space-x-3">
                            <Switch 
                                checked={draft_viponly} 
                                label={draft_viponly ? t("内容VIP可见") : t("内容订户可见")} 
                                onChange={(e)=>handeleBooleanGlobal(e , 'draft_viponly')}
                                className={draft_viponly ? "text-yellow-600 dark:text-yellow-400" : "text-gray-600 dark:text-gray-400"}
                                large={false}
                            />
                            <Popover content={this.renderGroupSelectMenu()} position={Position.BOTTOM_RIGHT} interactionKind={PopoverInteractionKind.CLICK}>
                                <Button rightIcon="caret-down" text={t("选择栏目")} minimal={true} className="text-gray-600 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400"/>
                            </Popover> 
                            <Button text={t("发送")} intent={Intent.PRIMARY} />
                        </div>
                    </div>
                </div>
                
                {/* Feed Filter */}
                <div className="sticky top-16 bg-white dark:bg-gray-800 shadow-md z-10 p-2 rounded-lg">
                    <div className="flex justify-around items-center space-x-1">
                        <ActivityLink label={t("热门")} to="/hot" className={`${filterLinkBaseClasses} ${currentPath === '/hot' ? filterLinkActiveClasses : filterLinkInactiveClasses}`} />
                        <ActivityLink label={t("全部")} to="/" activeOnlyWhenExact={true} className={`${filterLinkBaseClasses} ${currentPath === '/' ? filterLinkActiveClasses : filterLinkInactiveClasses}`} />
                        <ActivityLink label={t("VIP")} to="/paid" className={`${filterLinkBaseClasses} ${currentPath === '/paid' ? filterLinkActiveClasses : filterLinkInactiveClasses}`} />
                        <ActivityLink label={t("图片")} to="/media" className={`${filterLinkBaseClasses} ${currentPath === '/media' ? filterLinkActiveClasses : filterLinkInactiveClasses}`} />
                    </div>
                </div>

                {parseInt(new_feed_count, 10) > 0 && (
                    <div className="bg-blue-100 dark:bg-blue-900 border border-blue-400 dark:border-blue-700 text-blue-700 dark:text-blue-300 px-4 py-3 rounded relative cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800 text-center">
                        <Trans i18nKey="HasNewFeed" count={new_feed_count}>
                            有{{count: new_feed_count}}条新的动态，点此刷新
                        </Trans>
                    </div>
                )}

                {my_feeds && my_feeds.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 shadow rounded-lg">
                        {my_feeds.map((item) => (
                            <li key={item.id} className="p-4 flex space-x-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                                <img src={item.user.avatar} alt={item.user.username} className="w-10 h-10 rounded-full flex-shrink-0" />
                                <div className="flex-grow relative">
                                    {item.vip_only && (
                                        <div className="absolute top-0 right-0 text-yellow-500 dark:text-yellow-400" title={t("此内容VIP订户可见")}>
                                            <Icon icon="dollar" size={14} />
                                        </div>
                                    )}
                                    <div className="flex items-baseline">
                                        <span className="font-semibold text-gray-900 dark:text-white">{item.user.nickname}</span>
                                        <span className="ml-1 text-sm text-gray-500 dark:text-gray-400">@{item.user.username}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                                        <TimeAgo date={item.created_at} formatter={formatter} />
                                        &nbsp;·&nbsp;
                                        {t('来自')}&nbsp;<Link to={'/group/'+item.from_id} target="_blank" className="text-blue-500 hover:underline">{item.from}</Link> 
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 mb-2">{item.text}</div>
                                    
                                    {item.photos && item.photos.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {item.photos.map((photo, index) => (
                                                <a key={photo.thumb || index} href={photo.origin} target="_blank" rel="noopener noreferrer">
                                                    <img src={photo.cover || photo.thumb} alt={`${t('图片附件')} ${index + 1}`} className="w-24 h-24 object-cover rounded border border-gray-200 dark:border-gray-600" />
                                                </a>
                                            ))}
                                        </ul>
                                    )}
                                    {item.files && item.files.length > 0 && (
                                        <ul className="mt-2 space-y-1">
                                            {item.files.map((file, index) => (
                                                <li key={file.url || index} className="text-xs">
                                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500 hover:underline dark:text-blue-400">
                                                        <Icon icon="box" size={14} className="mr-1" />{file.name}
                                                    </a>
                                                </li> 
                                            ))}
                                        </ul>
                                    )}
                                    <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                                        <button className="flex items-center hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none">
                                            <LMIcon name="share" size={16} colorClassName="mr-1" />{item.share_count > 0 && <span>{item.share_count}</span>}
                                        </button>
                                        <button className="flex items-center hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none">
                                            <LMIcon name="comment" size={16} colorClassName="mr-1" />{item.comment_count > 0 && <span>{item.comment_count}</span>}
                                        </button>
                                        <button className="flex items-center hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none">
                                            <LMIcon name="up" size={16} colorClassName="mr-1" />{item.up_count > 0 && <span>{item.up_count}</span>}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                 ) : (
                    <div className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">{t("还没有关注的动态")}</div>
                 )}
            </div>
        );
        
        const rightSideContent = (
            <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 p-4 shadow rounded-lg">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center">
                        <Icon icon="flame" size={20} className="mr-2 text-red-500"/>{t("热门栏目")}
                    </h2>
                    {hot_groups && hot_groups.length > 0 ? (
                        <ul className="space-y-2">
                            {hot_groups.map((item) => (
                                <li key={item.id} className="flex items-center space-x-2 text-sm">
                                    <img src={item.cover} alt={item.title} className="w-8 h-8 rounded object-cover"/>
                                    <ActivityLink to={"/group/"+item.id} label={item.title} className="text-gray-700 dark:text-gray-300 hover:text-blue-500 dark:hover:text-blue-400 hover:underline truncate"/>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t("暂无热门栏目")}</p>
                    )}
                </div>        
                <div className="text-xs text-gray-400 dark:text-gray-500 p-4 text-center">
                    © {new Date().getFullYear()} Fi-Mi.com {/* Assuming Fi-Mi.com is the app name or a placeholder */}
                </div>
            </div>
        );

        return (
            <div> 
                <Header /> {/* Assumed refactored */}
                <Column3Layout left={leftSideContent} main={mainContent} right={rightSideContent} />
            </div>
        );
    }
}
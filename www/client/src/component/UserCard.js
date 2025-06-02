import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link is not directly used, UserLink handles it.
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import UserLink from './UserLink';
import UserAvatar from './UserAvatar'; // Assuming UserAvatar is updated for Tailwind size prop
import { toInt } from '../util/Function';

@translate()
@inject("store")
@withRouter
@observer
export default class UserCard extends Component
{
    render()
    {
        const { t } = this.props;
        const user = this.props.user || this.props.store.user; // Simplified conditional
        const usercard_cover_url = user.cover || '/usercard_cover.png';

        if( toInt( user.id ) === 0 ) return  null;
        
        return (
            // usercard equivalent
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
                {/* cover equivalent */}
                <div 
                    className="h-32 bg-cover bg-center" // Example height, can be adjusted (h-24, h-32, h-40)
                    style={{ backgroundImage: `url('${usercard_cover_url}')` }}
                ></div>
                
                {/* info equivalent */}
                <div className="p-4">
                    {/* avatar and username section */}
                    <div className="flex items-end -mt-16 mb-4"> {/* Negative margin to pull avatar up */}
                        {/* UserAvatar with size prop. cardavatar class was likely for border/offset, now handled here */}
                        <UserAvatar 
                            data={user} 
                            size="xl" // e.g., 'w-20 h-20' or 'w-24 h-24' (xl might be w-16 h-16, adjust as needed)
                            className="border-4 border-white dark:border-gray-800 rounded-full shadow-md" 
                        />
                        {/* username section */}
                        <div className="ml-3">
                            {/* title equivalent */}
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                                <UserLink data={user} className="hover:underline" />
                            </h2>
                            {/* desp equivalent */}
                            <p className="text-sm text-gray-600 dark:text-gray-400">@{user.username}</p>
                        </div>    
                    </div>

                    {/* count equivalent */}
                    <div className="flex justify-around text-center border-t border-gray-200 dark:border-gray-700 pt-3">
                        {/* groupcount, feedcount, upcount items */}
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t("栏目")}</span>
                            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-200">{parseInt( user.group_count , 10 )}</h1>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t("内容")}</span>
                            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-200">{parseInt( user.feed_count , 10 )}</h1>
                        </div> 
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase">{t("被赞")}</span>
                            <h1 className="text-lg font-bold text-gray-700 dark:text-gray-200">{parseInt( user.up_count , 10 )}</h1>
                        </div> 
                    </div> 
                </div>    
            </div>
        );   
    }
}
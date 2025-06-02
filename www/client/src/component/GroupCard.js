import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link is not used directly in this component
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
// Icon from blueprint is not used directly
import Web3 from 'web3';
// import BuyVipButton from '../component/BuyVipButton'; // This was commented out

@translate()
@inject("store") // store is injected but not directly used in render, only t and group from props.
@withRouter
@observer
export default class GroupCard extends Component
{
    render()
    {
        const { t , group } = this.props;

        if (!group) {
            return null; // Or a placeholder/loading state
        }
        
        // It's good practice to initialize Web3 outside render if it doesn't depend on props/state changing frequently.
        // However, if `Web3.givenProvider` can change, then it might be okay here.
        // For safety, and if provider is stable, consider moving to constructor or a utility instance.
        let price = 0;
        try {
            if (group.price_wei && parseFloat(group.price_wei) > 0) {
                const web3 = new Web3(Web3.givenProvider || "http://localhost:8545"); // Fallback provider for safety if none given
                price = web3.utils.fromWei( group.price_wei.toString() , 'ether' );
            }
        } catch (error) {
            console.error("Error converting price from Wei:", error);
            // price remains 0 or handle error as needed
        }
        
        const defaultCover = '/path/to/default/group_cover.png'; // Define a default cover if group.cover is missing
        const coverUrl = group.cover || defaultCover;

        return (
            // groupcard equivalent
            <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden my-2"> {/* Added margin for spacing if in a list */}
                {/* groupheader equivalent */}
                <div className="flex flex-col items-center justify-center p-6 bg-gray-100 dark:bg-gray-700"> {/* Example: Added bg color */}
                    {/* cover equivalent */}
                    <img 
                        src={coverUrl} 
                        alt={`${group.name || 'Group'} cover`} 
                        className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md mb-3"
                    />
                    {/* Group name */}
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white text-center">{group.name || t('未命名栏目')}</h1>
                </div>
                {/* groupnav equivalent */}
                <div className="flex justify-around items-center p-4 border-t border-gray-200 dark:border-gray-700">
                    {/* infos items */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("订户")}</p>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">{group.member_count || 0}</span>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("内容")}</p>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-200">{group.feed_count || 0}</span>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{t("VIP")}</p>
                        <span className="text-lg font-semibold text-gray-700 dark:text-gray-200" title={`${price} ETH`}>
                            {price} <small className="text-sm">Ξ</small>
                        </span>
                    </div>                           
                </div>
            </div>
        );
    }
}
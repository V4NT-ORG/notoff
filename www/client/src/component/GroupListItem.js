import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { translate } from 'react-i18next';
import Web3 from 'web3';
import { Button } from "@blueprintjs/core"; // Icon removed as it's not used directly

@withRouter
@translate()
@inject("store") // store is injected but not used.
@observer
export default class GroupListItem extends Component
{
    // constructor can be removed if state is just a copy of props.data
    // It's generally better to use props directly: this.props.data
    // If internal modifications were needed, then state would be appropriate.

    render()
    {
        const { t, data: item } = this.props; // Use props.data directly

        if (!item) return null;

        let price = '0';
        try {
            // Ensure item.price_wei exists and is a valid number string for fromWei
            if (item.price_wei && !isNaN(parseFloat(item.price_wei))) {
                const web3 = new Web3(Web3.givenProvider || "http://localhost:8545"); // Fallback provider
                price = web3.utils.fromWei(item.price_wei.toString(), 'ether');
            }
        } catch (error) {
            console.error("Error converting price from Wei for group " + item.id + ":", error);
            // price remains '0' or handle as needed
        }
        
        const defaultCover = '/path/to/default/cover.png'; // Define a default cover
        const coverUrl = item.cover || defaultCover;

        return (
            <li 
                key={item.id} 
                className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600"
            >
                {/* cover equivalent */}
                <div className="flex-shrink-0 mr-3">
                    <img 
                        src={coverUrl} 
                        alt={`${item.name || 'Group'} cover`} 
                        className="w-12 h-12 object-cover rounded-md sm:w-16 sm:h-16" // Responsive size example
                    />
                </div>
                {/* info equivalent */}
                <div className="flex-grow min-w-0"> {/* min-w-0 helps flexbox truncate text if needed */}
                    {/* title equivalent */}
                    <div className="text-base font-semibold text-gray-800 dark:text-white truncate">
                        <Link to={"/group/"+item.id} className="hover:underline">{item.name || t('未命名栏目')}</Link>
                    </div>
                    {/* count equivalent */}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {price}Ξ &nbsp;·&nbsp; 
                        {item.member_count || 0} {t("订户")}  
                        {item.feed_count > 0 && (
                            <span>&nbsp;·&nbsp; {item.feed_count} {t("内容")}</span>
                        )}
                    </div>
                </div> 
                {/* action equivalent */}
                <div className="ml-auto flex-shrink-0 pl-2">
                    <Button 
                        icon="arrow-right" 
                        minimal={true} 
                        onClick={()=>this.props.history.push("/group/"+item.id)}
                        className="text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400" // Basic coloring for minimal button
                    />
                </div>   
            </li>
        );
    }
}
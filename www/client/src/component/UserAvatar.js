import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
import { withRouter, Link } from 'react-router-dom';
import { translate } from 'react-i18next';

@withRouter
@translate()
@inject("store") // store is injected but not used. Could be removed if not planned for future use.
@observer
export default class UserAvatar extends Component
{
    render()
    {
        const { data: user, className: propsClassName, size = 'md' } = this.props; // Default size to 'md'

        if (!user) {
            return null;
        }

        const defaultAvatar = '/image/avatar.jpg';
        const avatarUrl = user.avatar || defaultAvatar;

        let sizeClasses = '';
        switch (size) {
            case 'xs':
                sizeClasses = 'w-6 h-6';
                break;
            case 'sm':
                sizeClasses = 'w-8 h-8';
                break;
            case 'lg':
                sizeClasses = 'w-12 h-12';
                break;
            case 'xl':
                sizeClasses = 'w-16 h-16';
                break;
            case 'md': // Default case
            default:
                sizeClasses = 'w-10 h-10'; // Or a common default like w-10 h-10 (40px)
                break;
        }

        // Base classes for the image
        const imageBaseClasses = `rounded-full object-cover`;
        
        // Combine propsClassName with any classes applied by this component to the Link
        // For this component, the primary styling is on the image. 
        // The propsClassName is applied to the Link wrapper.
        const linkClassName = propsClassName || ''; 

        return (
            <Link 
                to={'/user/' + user.id} 
                target="_blank" // Consider if target="_blank" is always desired
                title={'@' + user.username} 
                className={linkClassName}
            >
                <img 
                    src={avatarUrl} 
                    alt={user.username || 'User avatar'} 
                    className={`${imageBaseClasses} ${sizeClasses}`} 
                />
            </Link>
        );
    }
}
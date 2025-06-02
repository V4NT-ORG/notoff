import React, { Component } from 'react';
import PropTypes from 'prop-types'; // Changed from 'prop-types' for standard import
// strip function was imported but not used.
import nl2br from 'react-nl2br';
import Linkify from 'react-linkify';

class FeedText extends Component {
    state = {
        expanded: false,
    };

    // Ensure 'this' is correctly bound for toggleLines if not using arrow function
    toggleLines = () => {
        this.setState(prevState => ({ expanded: !prevState.expanded }));
    }

    render() {
        const { 
            text, 
            maxlength: propsMaxlength, 
            more: propsMore, 
            less: propsLess, 
            className: propsClassName // This className is for the span around more/less links
        } = this.props;

        if (text === null || text === undefined) {
            return null; // Or render some placeholder if text is critical
        }

        const maxlength = propsMaxlength || 300;
        const isTooLong = text.length > maxlength; // Renamed from toolong for clarity
        
        // Use substring for shorttext, not substr which is deprecated
        const shortText = isTooLong ? text.substring(0, maxlength) : text;
        const longText = text; // Full text

        const moreLinkText = propsMore || 'more';
        const lessLinkText = propsLess || 'less';
        
        const linkClassName = "text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer focus:outline-none";
        const linkifyProperties = { target: '_blank', className: 'text-blue-600 hover:underline dark:text-blue-500' };


        // The main div no longer needs `feedtextcomponent` if all styling is contextual or via props.
        // Parent component (e.g., FeedItem) should apply text styling like `prose` or specific text color/size classes.
        return (
            <div> 
                {isTooLong ? (
                    <div>
                        {!this.state.expanded ? (
                            <div>
                                <Linkify properties={linkifyProperties}>{nl2br(shortText)}</Linkify>
                                <span className={propsClassName}>
                                    ... <a onClick={this.toggleLines} className={linkClassName} role="button" tabIndex={0} onKeyPress={this.toggleLines}>{moreLinkText}</a>
                                </span>
                            </div>
                        ) : (
                            <div>
                                <Linkify properties={linkifyProperties}>{nl2br(longText)}</Linkify>
                                <span className={propsClassName}>
                                    {' '}<a onClick={this.toggleLines} className={linkClassName} role="button" tabIndex={0} onKeyPress={this.toggleLines}>{lessLinkText}</a>
                                </span>
                            </div>
                        )}       
                    </div>
                ) : (
                    <div>
                        <Linkify properties={linkifyProperties}>{nl2br(longText)}</Linkify>
                    </div>
                )}
            </div>
        );
    }
}

FeedText.propTypes = {
    text: PropTypes.string.isRequired,
    maxlength: PropTypes.number,
    more: PropTypes.node, // Can be string or React node
    less: PropTypes.node, // Can be string or React node
    className: PropTypes.string, // For the span around more/less links
};

FeedText.defaultProps = {
    maxlength: 300,
    more: 'more',
    less: 'less',
    className: '',
};

export default FeedText;
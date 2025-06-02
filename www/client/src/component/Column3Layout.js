import React, { Component } from 'react';
import { observer , inject } from 'mobx-react';
// Link not used directly
import { withRouter } from 'react-router-dom';
// translate not used directly, but HOC still applied
import { translate } from 'react-i18next'; 

import Header from './Header'; // Assumed refactored
// ScrollTopView was imported but not used in the original render
import FloatEditor from '../component/FloatEditor'; // Positioned fixed/absolute by itself
import ImBox from '../component/ImBox'; // Positioned fixed/absolute by itself

@translate()
@inject("store")
@withRouter
@observer
export default class Column3Layout extends Component
{
    // The componentDidMount logic for hiding leftside is best handled by responsive classes
    // or conditional rendering based on the `left` prop.
    // Direct DOM manipulation like this is discouraged in React and can conflict with Tailwind.

    render()
    {
        const { left, right, main, store } = this.props;
        const show_im = store.im_open;

        // Define column spans for a 12-column grid system
        // Example: Left (3/12), Main (6/12), Right (3/12) on medium screens and up
        // On small screens (default), main content takes full width, sidebars might stack or hide.
        
        // Base container for the page, handling potential fixed header offset
        // clo3 equivalent
        return (
            <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
                <FloatEditor /> {/* Assumed to be fixed/absolute positioned */}
                <Header /> {/* Assumed to be fixed, taking h-16 (4rem) */}
                
                {/* middle equivalent: This div will contain the three columns */}
                {/* pt-16 for fixed header offset */}
                <div className="flex-grow container mx-auto px-2 sm:px-4 lg:px-6 xl:px-8 pt-16"> 
                    {/* contentbox equivalent: Using Tailwind's responsive grid */}
                    <div className="grid grid-cols-12 gap-4 lg:gap-6">
                        
                        {/* leftside: Only render if 'left' prop is provided. Hidden on small screens, shown on md+ */}
                        {left && (
                            <aside className="hidden md:block md:col-span-3 lg:col-span-3 xl:col-span-2 space-y-4">
                                {left}
                            </aside>
                        )}
                        
                        {/* main content: Adjust col-span based on presence of sidebars */}
                        <main 
                            className={`
                                ${!left && !right ? 'col-span-12' : ''}
                                ${left && !right ? 'col-span-12 md:col-span-9 lg:col-span-9 xl:col-span-10' : ''}
                                ${!left && right ? 'col-span-12 md:col-span-9 lg:col-span-9 xl:col-span-10' : ''}
                                ${left && right ? 'col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-8' : ''}
                                space-y-4
                            `}
                        >
                            {main}
                        </main>
                        
                        {/* rightside: Only render if 'right' prop is provided. Hidden on small screens, shown on lg+ */}
                        {/* Example: right sidebar might appear later than left on medium screens */}
                        {right && (
                            <aside className="hidden lg:block lg:col-span-3 xl:col-span-2 space-y-4">
                                {right}
                            </aside>
                        )}
                    </div>
                </div>
                {show_im && <ImBox key={1024} />} {/* Assumed to be fixed/absolute positioned */}
            </div>
        );
    }
}
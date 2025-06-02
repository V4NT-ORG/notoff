import React, { Component } from 'react'; // Fragment removed, Link not used directly
import { observer , inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { sprintf } from 'sprintf-js';
import { Icon, TextArea, Button, Intent, Colors, Switch } from "@blueprintjs/core"; // Popover, Position, PopoverInteractionKind removed as not directly used by PublishBox structure
import { handeleBooleanGlobal, groupsToId, toast, handeleStringGlobal, showApiError, isApiOk } from '../util/Function';

import Select from 'react-select'; // External component, styling will be mostly as-is or via its own props
import Dropzone from 'react-dropzone'; // External component
import ReactFileReader from 'react-file-reader'; // External component

@withRouter
@translate()
@inject("store")
@observer
export default class PublishBox extends Component
{
    // state = { "togroups":[] } // This state seems unused.
    
    async publish()
    {
        const store = this.props.store;
        const { t } = this.props;
        
        if( store.draft_text.length < 1 ) {
            toast(t("内容不能为空"));
            return false;
        }
        if( store.draft_groups.length < 1 ) {
            toast(t("请选择要发布到的栏目"));
            this.props.store.draft_groups_menu_open = true;
            return false;
        }
        
        const attachment = (this.props.store.draft_attachment_url && this.props.store.draft_attachment_name) 
            ? { "url":this.props.store.draft_attachment_url , "name":this.props.store.draft_attachment_name} 
            : null; // Send null or empty object if no attachment

        const { data } = await store.publishFeed( store.draft_text , groupsToId( store.draft_groups ) , store.draft_images , attachment , store.draft_is_paid | 0 );

        if( isApiOk( data ) ) {
            toast( t("内容发布成功") );
            if( this.props.onFinish ) this.props.onFinish( data );
        } else {
            showApiError( data , t );
        }
    }

    async update()
    {
        const store = this.props.store;
        const { t } = this.props;

        if( store.draft_text.length < 1 ) {
            toast(t("内容内容不能为空"));
            return false;
        }
        if( store.draft_feed_id < 1 ) {
            toast(t("修改的内容ID丢失，请刷新页面后重试"));
            return false;
        }
        
        const attachment = (this.props.store.draft_attachment_url && this.props.store.draft_attachment_name)
            ? { "url":this.props.store.draft_attachment_url , "name":this.props.store.draft_attachment_name}
            : null;

        const { data } = await store.updateFeed( store.draft_feed_id , store.draft_text , store.draft_images ,  attachment , store.draft_is_paid | 0 ); // store.user.draft_is_paid seems like a typo, should be store.draft_is_paid

        if( isApiOk( data ) ) {
            toast( t("内容更新成功") );
            if( this.props.onFinish ) this.props.onFinish( data );
        } else {
            showApiError( data , t );
        }
    }

    handleSelect = (selectedOptions) => { // Renamed e to selectedOptions for clarity
        this.props.store.draft_groups = selectedOptions;
    }

    handleDrop = async (acceptedFiles) => { // Renamed files to acceptedFiles
        const { t, store } = this.props;
        const currentImageCount = store.draft_images.length;

        if( acceptedFiles.length + currentImageCount > 12 ) {
            toast(t("一条内容最多只能附带12张图片"));
            return false;
        }

        let uploaded_images = [];
        for( let i = 0 ; i < acceptedFiles.length ; i++ ) {
            const file = acceptedFiles[i];
            if( file.size > 1024*1024*50 ) { // 50MB limit
                toast(t("文件过大，请不要超过50M"));
                continue;
            }   
            
            const result = await store.uploadImage( file );
            if( result.data.code === 0 ) {
                uploaded_images.push( result.data.data );
                toast(sprintf(t("第%s张图片上传成功。"), currentImageCount + i + 1));
            } else {
                toast(sprintf(t("第%s张图片上传失败，请留意图片的大小。"), currentImageCount + i + 1) + result.data.message);
            }   
        }
        
        if( !Array.isArray( store.draft_images ) ) store.draft_images = [];
        store.draft_images = store.draft_images.concat( uploaded_images );
          
        if( store.draft_text.length < 1 && store.draft_images.length > 0) {
            store.draft_text = t("分享图片");
        }
    }

    removeImage = (thumb_url_to_remove) => { // Renamed thumb_url
        this.props.store.draft_images = this.props.store.draft_images.filter(item => item.thumb_url !== thumb_url_to_remove);
    }

    onAttachementSelected = async (files) => { // Renamed from onAttachementSelected
        const { store, t } = this.props;
        if( files[0] ) {
            if( files[0].size > 1024*1024*5 ) { // 5MB limit
                toast(t("文件过大，请不要超过5M"));
                return false;
            }    
            const { data } = await store.uploadAttachment( files[0].name , files[0]  );
            if( isApiOk( data ) ) {
                const { name , url } = data.data;
                store.draft_attachment_name = name;
                store.draft_attachment_url = url;
            } else {
                showApiError( data , t );
            }
        }
    }

    cancelUpdate = () => {
        if (this.props.onClose) this.props.onClose(); // Check if onClose exists
        this.props.store.cleanUpdate(); // Assuming this cleans draft related to updates
        // Also clean general draft?
        // this.props.store.cleanDraft(); // If there's a general draft cleaner
    }

    render()
    {
        const { store, className: propsClassName, groups: options, onClose } = this.props;
        const { t } = this.props;
        
        const finalClassName = `bg-white dark:bg-gray-800 p-4 rounded-lg shadow ${propsClassName || ''}`; // publishbox equivalent + px10list (padding handled by p-4)
        
        return (
            <div className={finalClassName}>
                {/* TextArea with Tailwind classes */}
                <TextArea 
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white" 
                    placeholder={t("今天有什么好东西分享到栏目？")} 
                    value={store.draft_text} 
                    onChange={(e)=>handeleStringGlobal( e , 'draft_text' )} 
                    maxLength={store.draft_text_max}
                    fill={true} // Blueprint prop to fill width
                />

                {store.draft_action === 'insert' && (
                    // Group for Select component
                    <div className="mt-3"> 
                        <Select 
                            placeholder={t("请选择栏目，栏主直发，订户投稿需审核")}
                            closeMenuOnSelect={true}
                            isMulti
                            options={options || []}
                            value={store.draft_groups}
                            classNamePrefix="groupselect" // react-select uses this for its internal classes
                            noOptionsMessage={()=>t("没有可用的栏目啦")}
                            onChange={this.handleSelect}
                            menuIsOpen={store.draft_groups_menu_open}
                            onMenuClose={()=>{store.draft_groups_menu_open=false}}
                            onMenuOpen={()=>{store.draft_groups_menu_open=true}}
                            // Styles for react-select to better fit Tailwind dark mode can be complex.
                            // Basic theming can be done via its `styles` prop if needed.
                            // For now, relying on its default styling + classNamePrefix.
                        />
                    </div>
                )}

                {/* action equivalent */}
                <div className="mt-3 flex flex-wrap items-center justify-between">
                    {/* icons equivalent */}
                    <div className="flex items-center space-x-3">
                        <Dropzone 
                            accept="image/png,image/jpg,image/jpeg" 
                            maxSize={1024*1024*10} // 10MB, original had 50MB then 5M, making it consistent
                            multiple={true} 
                            onDrop={this.handleDrop}
                        >
                            {({getRootProps, getInputProps}) => (
                                <div {...getRootProps()} className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                    <input {...getInputProps()} />
                                    <Icon icon="media" size={20} color={Colors.GRAY4} title={t("请选择要上传的图片（支持 png 和 jpg 文件），最大10M")}/>
                                </div>
                            )}
                        </Dropzone>
                        
                        <div className="flex items-center">
                            <ReactFileReader fileTypes={["audio/*","video/*","application/zip","text/plain"]} handleFiles={this.onAttachementSelected} >
                                <button type="button" className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title={t("请选择要上传的附件，支持常见的音频、视频，文本和Zip格式，最大5M")}>
                                    <Icon icon="paperclip" size={20} color={store.draft_attachment_url ? Colors.BLUE4 : Colors.GRAY4} />
                                </button>
                            </ReactFileReader>
                            {store.draft_attachment_url && (
                                <Button icon="cross" minimal={true} small={true} onClick={()=>store.clean_attach()} className="ml-1" />
                            )}
                        </div>
                    </div> 
                    
                    {/* type (Switch) and button section */}
                    <div className="flex items-center space-x-3 mt-2 sm:mt-0">
                        {store.draft_action === 'insert' && (
                             <Switch 
                                checked={store.draft_is_paid} 
                                label={store.draft_is_paid ? t("VIP可见") : t("订户可见")} 
                                large={false} // large=true might be too big for this layout
                                onChange={(e)=>handeleBooleanGlobal(e , 'draft_is_paid')} 
                                className={store.draft_is_paid ? "" : "text-gray-500 dark:text-gray-400"} // gray5 equivalent
                            />
                        )}
                        
                        {/* Main action buttons */}
                        <div className="flex items-center">
                            {store.draft_action === 'insert' && ( 
                                <Button 
                                    text={onClose ? t("发送") : t("发布 or 投稿")} 
                                    intent={Intent.PRIMARY} 
                                    onClick={this.publish}
                                />
                            )}
                            {store.draft_action === 'update' && (
                                <Button text={t("更新")} intent={Intent.PRIMARY} onClick={this.update}/>
                            )}
                            {onClose && (
                                <Button text={t("取消")} intent={Intent.NONE} onClick={this.cancelUpdate} className="ml-2"/>
                            )}
                        </div>
                    </div>
                </div>

                {Array.isArray(store.draft_images) && store.draft_images.length > 0 && (
                    // uploadedimages equivalent
                    <div className="mt-3 flex flex-wrap gap-2"> 
                        {store.draft_images.map( (image, idx) => (
                            // upimagebox equivalent
                            <div key={image.thumb_url || idx} className="relative inline-block">
                                <img 
                                    src={image.thumb_url} 
                                    alt={t('上传的图片') + ' ' + (idx+1)}
                                    className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600 cursor-pointer" 
                                    onClick={()=>window.open(image.orignal_url, '_blank')} 
                                />
                                {/* imagecross pointer equivalent */}
                                <button 
                                    type="button"
                                    className="absolute top-0 right-0 bg-black bg-opacity-50 text-white rounded-full p-0.5 leading-none hover:bg-opacity-75 focus:outline-none"
                                    onClick={()=>this.removeImage(image.thumb_url)} 
                                    title={t("删除这张图片")}
                                >
                                    <Icon icon="small-cross" size={14} />
                                </button>
                            </div>
                        ))}        
                    </div>
                )}
            </div>
        );
    }
}
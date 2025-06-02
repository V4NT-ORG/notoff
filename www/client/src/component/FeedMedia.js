import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { Button, Icon } from "@blueprintjs/core";
import ModalImage from "react-modal-image";
import { toast } from '../util/Function';

// Helper function for safe JSON parsing
const safeJsonParse = (jsonString, defaultValue = null) => {
    if (!jsonString || typeof jsonString !== 'string') {
        return Array.isArray(jsonString) ? jsonString : defaultValue; // Already parsed or not a string
    }
    try {
        const parsed = JSON.parse(jsonString);
        // Ensure result is an array for consistency if expected
        if (defaultValue && Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            // If we expect an array but got a single object, wrap it.
            // This specific logic might need adjustment based on how 'files' are structured.
            // For now, let's assume if it's not an array after parsing, and we expect one, return default or handle specific cases.
            // The original FeedItem logic for 'files' was:
            // if( fdata.url && fdata.name  ) item.files =  [fdata]; else item.files = false;
            // This implies 'files' could be a single object string.
            // For 'images', it was just JSON.parse.
            return parsed;
        }
        return parsed;
    } catch (error) {
        // console.error("Failed to parse JSON:", error); // Optional: log error during dev
        return defaultValue;
    }
};


@withRouter
@translate()
@inject("store")
@observer
export default class FeedMedia extends Component {
    render() {
        const { t, item, store } = this.props;
        let i = 0; // For key generation, consider more robust key source if available

        // Safe parsing for images, defaulting to an empty array
        const images = safeJsonParse(item.images, []);
        
        // Safe parsing for files
        // The original logic for files was a bit specific:
        // if( item.files ) {
        //     const  fdata = JSON.parse( item.files );
        //     if( fdata.url && fdata.name  ) item.files =  [fdata]; else item.files = false;    
        // }
        // We'll try to replicate this safe parsing.
        let files = [];
        if (item.files) {
            const parsedFiles = safeJsonParse(item.files, null);
            if (parsedFiles) {
                if (Array.isArray(parsedFiles)) {
                    files = parsedFiles;
                } else if (parsedFiles.url && parsedFiles.name) { // Single file object
                    files = [parsedFiles];
                }
            }
        }


        return (
            <div>
                {images && Array.isArray(images) && images.length > 0 && (
                    <ul className="photos">
                        {images.map((image, index) => (
                            <li key={image.thumb_url || `img-${index}`}> {/* Ensure key is unique */}
                                {typeof window.fowallet?.requestDownload === 'function' ? (
                                    <img
                                        src={image.thumb_url}
                                        alt="cover"
                                        className="thumb"
                                        onClick={() => {
                                            try {
                                                window.fowallet.requestDownload(
                                                    { "fileUrl": image.orignal_url, "fileName": "cover.png" },
                                                    (res) => { 
                                                        // Assuming res is an object with a success/status field or similar
                                                        // For now, just show the original toast. Add error handling if fowallet provides status.
                                                        toast(t("已保存，请在「钱包」→「我的」→「我的下载」中分享到相册")); 
                                                    }
                                                );
                                            } catch (e) {
                                                // console.error("Fowallet download error for image:", e);
                                                // Fallback to generic download if fowallet call fails unexpectedly
                                                store.download(image.orignal_url, "cover.png");
                                                toast(t("正在尝试备用下载方式..."));
                                            }
                                        }}
                                    />
                                ) : (
                                    <ModalImage small={image.thumb_url} large={image.orignal_url} className="thumb" alt={t("点击放大")} />
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {files && Array.isArray(files) && files.length > 0 && (
                    <ul className="files">
                        {files.map((file, index) => (
                            <li key={file.url || `file-${index}`}> {/* Ensure key is unique */}
                                {typeof window.fowallet?.requestDownload === 'function' ? (
                                    <Button
                                        text={file.name}
                                        onClick={() => {
                                            try {
                                                window.fowallet.requestDownload(
                                                    { "fileUrl": file.url, "fileName": file.name },
                                                    (res) => {
                                                        toast(t("已保存，请在「钱包」→「我的」→「我的下载」中分享或打开"));
                                                    }
                                                );
                                            } catch (e) {
                                                // console.error("Fowallet download error for file:", e);
                                                store.download(file.url, file.name);
                                                toast(t("正在尝试备用下载方式..."));
                                            }
                                        }}
                                    />
                                ) : (
                                    <Button
                                        text={file.name}
                                        onClick={() => store.download(file.url, file.name)}
                                        icon="paperclip"
                                        minimal={true}
                                        large={true}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        );
    }
}

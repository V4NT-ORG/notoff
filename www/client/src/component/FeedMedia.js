import React, { Component } from 'react';
import { observer, inject } from 'mobx-react';
import { withRouter } from 'react-router-dom';
import { translate } from 'react-i18next';
import { Button, Icon, Colors } from "@blueprintjs/core"; // Added Colors for fallback icon color
import ModalImage from "react-modal-image"; // External component, styling is mostly internal
import { toast } from '../util/Function';

// Helper function for safe JSON parsing
const safeJsonParse = (jsonString, defaultValue = null) => {
    if (jsonString === null || jsonString === undefined) return defaultValue;
    if (typeof jsonString !== 'string') {
        // If it's already an object/array and we expect that, return it, otherwise wrap if needed or return default
        if (Array.isArray(defaultValue) && !Array.isArray(jsonString) && typeof jsonString === 'object' && jsonString !== null) {
            // Handle cases where a single object might be passed but an array is expected (e.g. single file)
             if (jsonString.url && jsonString.name) return [jsonString]; // Wrap single file object into an array
        }
        return Array.isArray(jsonString) || typeof jsonString === 'object' ? jsonString : defaultValue;
    }
    try {
        const parsed = JSON.parse(jsonString);
        // If expecting an array but got a single object (e.g. single file object as string)
        if (Array.isArray(defaultValue) && !Array.isArray(parsed) && typeof parsed === 'object' && parsed !== null) {
            if (parsed.url && parsed.name) return [parsed]; // Wrap single file object into an array
        }
        return parsed;
    } catch (error) {
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

        // Images: Expects an array of objects [{ thumb_url, orignal_url }, ...]
        const images = safeJsonParse(item.images, []);
        
        // Files: Expects an array of objects [{ url, name }, ...]
        // The safeJsonParse helper was updated to potentially wrap a single file object string into an array.
        const files = safeJsonParse(item.files, []);

        const hasImages = Array.isArray(images) && images.length > 0;
        const hasFiles = Array.isArray(files) && files.length > 0;

        if (!hasImages && !hasFiles) {
            return null; // Nothing to render
        }

        return (
            <div className="mt-2"> {/* Added margin-top for spacing from feed text */}
                {hasImages && (
                    // photos equivalent: Tailwind flex grid
                    <ul className="flex flex-wrap gap-2">
                        {images.map((image, index) => (
                            <li key={image.orignal_url || image.thumb_url || `img-${index}`} className="relative">
                                {typeof window.fowallet?.requestDownload === 'function' ? (
                                    <img
                                        src={image.thumb_url}
                                        alt={`${t('图片')} ${index + 1}`}
                                        // thumb equivalent: Tailwind classes for size, object-fit, rounded corners, border
                                        className="w-24 h-24 object-cover rounded-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-80"
                                        onClick={() => {
                                            try {
                                                window.fowallet.requestDownload(
                                                    { "fileUrl": image.orignal_url, "fileName": `image_${index + 1}.png` }, // provide a default filename
                                                    (res) => { 
                                                        toast(t("已保存，请在「钱包」→「我的」→「我的下载」中分享到相册")); 
                                                    }
                                                );
                                            } catch (e) {
                                                store.download(image.orignal_url, `image_${index + 1}.png`);
                                                toast(t("正在尝试备用下载方式..."));
                                            }
                                        }}
                                    />
                                ) : (
                                    // react-modal-image uses its own classes, apply Tailwind to its wrapper if needed
                                    // The 'className' prop on ModalImage applies to the small image.
                                    <ModalImage 
                                        small={image.thumb_url} 
                                        large={image.orignal_url} 
                                        alt={`${t('图片')} ${index + 1} - ${t("点击放大")}`}
                                        className="w-24 h-24 object-cover rounded-md border border-gray-200 dark:border-gray-700" 
                                        hideDownload={true} // Example: hide default download if using custom or fowallet
                                        hideZoom={false}
                                    />
                                )}
                            </li>
                        ))}
                    </ul>
                )}

                {hasFiles && (
                    // files equivalent: Tailwind list or flex column
                    <ul className={`mt-2 space-y-1 ${hasImages ? 'pt-2 border-t border-gray-200 dark:border-gray-700' : ''}`}>
                        {files.map((file, index) => (
                            <li key={file.url || `file-${index}`} className="text-xs">
                                {typeof window.fowallet?.requestDownload === 'function' ? (
                                    <Button
                                        text={file.name || t("未命名文件")}
                                        icon={<Icon icon="paperclip" color={Colors.GRAY3} className="mr-1"/>} // Pass Icon component for custom class
                                        minimal={true}
                                        small={true}
                                        className="text-blue-600 dark:text-blue-400 hover:underline p-0 h-auto"
                                        onClick={() => {
                                            try {
                                                window.fowallet.requestDownload(
                                                    { "fileUrl": file.url, "fileName": file.name || "downloaded_file" },
                                                    (res) => {
                                                        toast(t("已保存，请在「钱包」→「我的」→「我的下载」中分享或打开"));
                                                    }
                                                );
                                            } catch (e) {
                                                store.download(file.url, file.name || "downloaded_file");
                                                toast(t("正在尝试备用下载方式..."));
                                            }
                                        }}
                                    />
                                ) : (
                                    <Button
                                        text={file.name || t("未命名文件")}
                                        onClick={() => store.download(file.url, file.name || "downloaded_file")}
                                        icon={<Icon icon="paperclip" color={Colors.GRAY3} className="mr-1"/>}
                                        minimal={true}
                                        small={true}
                                        className="text-blue-600 dark:text-blue-400 hover:underline p-0 h-auto" // Minimal button styling
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

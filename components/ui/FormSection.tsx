import React from 'react';

const FormSection: React.FC<{ title: string; children: React.ReactNode; className?: string; }> = ({ title, children, className }) => {
    return (
        <fieldset className="border border-gray-200 dark:border-gray-700/80 rounded-lg p-4">
            <legend className="px-2 text-base font-semibold text-gray-800 dark:text-gray-200">{title}</legend>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
                {children}
            </div>
        </fieldset>
    );
};

export default FormSection;

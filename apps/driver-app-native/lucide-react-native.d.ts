declare module 'lucide-react-native' {
    import { SvgProps } from 'react-native-svg';
    import { ReactNode } from 'react';
    export interface LucideProps extends SvgProps {
        size?: number | string;
        color?: string;
        strokeWidth?: number | string;
    }
    export const Chrome: (props: LucideProps) => ReactNode;
    export const User: (props: LucideProps) => ReactNode;
    export const LayoutDashboard: (props: LucideProps) => ReactNode;
    export const Settings: (props: LucideProps) => ReactNode;
}

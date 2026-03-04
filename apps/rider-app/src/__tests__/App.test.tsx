import { render, screen } from '@testing-library/react';
import { expect, test, describe } from 'vitest';
import App from '../App';
import React from 'react';

describe('Rider App Rendering', () => {
    test('renders the welcome screen', () => {
        // We would mock Supabase/Contexts for deeper tests
        // but here we check for the basic brand presence
        render(<App />);
        const linkElement = screen.getByText(/UrWay/i);
        expect(linkElement).toBeInTheDocument();
    });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Component to test
import { Front } from './Front'; // Assuming Front is a named export

// Mock history and location for withRouter
const mockHistoryPush = jest.fn();
const mockLocation = { pathname: '/' };

// Mock Store
const mockStore = {
  appname: 'TestApp',
  register: jest.fn(),
  login: jest.fn(),
  // Add any other store properties/methods Front component might access
  default_fo_address: '0x123DefaultAddress', 
};

// Mock dependencies
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  withRouter: Component => props => (
    <Component
      {...props}
      history={{ ...props.history, push: mockHistoryPush }}
      location={{ ...props.location, ...mockLocation }}
    />
  ),
}));

jest.mock('react-i18next', () => ({
  translate: () => Component => {
    Component.defaultProps = { ...Component.defaultProps, t: jest.fn(key => key) };
    return Component;
  },
}));

jest.mock('mobx-react', () => ({
  ...jest.requireActual('mobx-react'),
  inject: (...stores) => Component => props => <Component {...props} {...stores.reduce((acc, storeName) => ({...acc, [storeName]: mockStore}), {})} />,
  observer: Component => Component,
}));

jest.mock('../util/Function', () => ({
  toast: jest.fn(),
  showApiError: jest.fn(),
  is_fo_address: jest.fn(() => true), // Default to true for FO address validation
}));

jest.mock('../Icon', () => () => <div data-testid="mock-icon" />);
jest.mock('../component/LangIcon', () => () => <div data-testid="mock-lang-icon" />);
jest.mock('../component/ScrollTopView', () => () => <div data-testid="mock-scroll-top-view" />);
jest.mock('react-document-title', () => ({ children }) => <>{children}</>); // Simple passthrough
jest.mock('react-cookie-consent', () => () => <div data-testid="mock-cookie-consent" />);


describe('Front Screen Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockLocation.pathname = '/'; // Reset path to default for each test
  });

  // --- Rendering & Tabs ---
  test('renders the registration form by default', () => {
    render(<Front store={mockStore} />); // Pass mockStore directly if inject mock isn't picking it up or for clarity
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nickname')).toBeInTheDocument();
    expect(screen.getByText('REGISTER')).toBeInTheDocument(); // Assuming button text
  });

  test('renders the login form when props.location.pathname is /login', () => {
    mockLocation.pathname = '/login'; // Set path for this test
    render(<Front store={mockStore} />);
    expect(screen.getByPlaceholderText('Email / Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByText('LOGIN')).toBeInTheDocument();
  });

  test('user can switch between register and login tabs', async () => {
    render(<Front store={mockStore} />);
    // Default is register form
    expect(screen.getByText('REGISTER')).toBeInTheDocument();

    // Click login tab
    fireEvent.click(screen.getByText('LOGIN')); // Assuming tab text is 'LOGIN'
    // Wait for potential async state updates if any, though simple tab switch might be sync
    await waitFor(() => {
        expect(screen.getByPlaceholderText('Email / Username')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('Username')).not.toBeInTheDocument(); // Register specific field

    // Click register tab again
    fireEvent.click(screen.getByText('REGISTER'));
    await waitFor(() => {
        expect(screen.getByPlaceholderText('Username')).toBeInTheDocument();
    });
    expect(screen.queryByPlaceholderText('Email / Username')).not.toBeInTheDocument(); // Login specific field
  });

  // --- Registration Form ---
  describe('Registration Form', () => {
    beforeEach(() => {
        mockLocation.pathname = '/'; // Ensure registration tab is active
    });

    test('typing in input fields updates their values', () => {
      render(<Front store={mockStore} />);
      const emailInput = screen.getByPlaceholderText('Email');
      const usernameInput = screen.getByPlaceholderText('Username');
      
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(usernameInput, { target: { value: 'testuser' } });

      expect(emailInput.value).toBe('test@example.com');
      expect(usernameInput.value).toBe('testuser');
    });

    test('client-side validation: submitting with empty email calls toast', () => {
      render(<Front store={mockStore} />);
      fireEvent.click(screen.getByText('REGISTER'));
      expect(require('../util/Function').toast).toHaveBeenCalledWith('Email地址不能为空');
    });
    
    test('client-side validation: submitting with empty username calls toast', () => {
      render(<Front store={mockStore} />);
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'test@example.com' } });
      fireEvent.click(screen.getByText('REGISTER'));
      expect(require('../util/Function').toast).toHaveBeenCalledWith('用户名不能为空');
    });


    test('successful registration', async () => {
      render(<Front store={mockStore} />);
      mockStore.register.mockResolvedValueOnce({ data: { nickname: 'testuser1' } });

      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'valid@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'testuser1' } });
      fireEvent.change(screen.getByPlaceholderText('Nickname'), { target: { value: 'Test User' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
      // Assuming FO Address might be optional or filled by default from store.default_fo_address
      // If it's mandatory and empty, test would fail on client validation.
      // For this test, let's assume it's either optional or default_fo_address is used.
      // If FO address field is `this.state.address`, it will be empty string by default.

      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => 
        expect(mockStore.register).toHaveBeenCalledWith(
          'valid@example.com', 
          'Test User', // Nickname
          'testuser1', // Username
          'password123',
          '' // FO Address (this.state.address default empty string)
        )
      );
      await waitFor(() => 
        expect(require('../util/Function').toast).toHaveBeenCalledWith('testuser1注册成功，请登入')
      );
      // Assert login tab becomes active (e.g., login-specific field appears)
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Email / Username')).toBeInTheDocument();
      });
    });

    test('failed registration (API error)', async () => {
      render(<Front store={mockStore} />);
      mockStore.register.mockResolvedValueOnce({ code: 1, info: 'Registration failed' });

      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'fail@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'failuser' } });
      fireEvent.change(screen.getByPlaceholderText('Nickname'), { target: { value: 'Fail User' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('REGISTER'));

      await waitFor(() => expect(mockStore.register).toHaveBeenCalled());
      await waitFor(() => expect(require('../util/Function').showApiError).toHaveBeenCalledWith({ code: 1, info: 'Registration failed' }));
    });
  });

  // --- Login Form ---
  describe('Login Form', () => {
    beforeEach(() => {
      mockLocation.pathname = '/login'; // Set to login tab
    });

    test('typing in input fields updates their values', () => {
      render(<Front store={mockStore} />);
      const emailInput = screen.getByPlaceholderText('Email / Username');
      const passwordInput = screen.getByPlaceholderText('Password');
      
      fireEvent.change(emailInput, { target: { value: 'login@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'secret' } });

      expect(emailInput.value).toBe('login@example.com');
      expect(passwordInput.value).toBe('secret');
    });

    test('client-side validation: submitting with empty email calls toast', () => {
      render(<Front store={mockStore} />);
      fireEvent.click(screen.getByText('LOGIN'));
      expect(require('../util/Function').toast).toHaveBeenCalledWith('Email地址不能为空');
    });

    test('successful login', async () => {
      render(<Front store={mockStore} />);
      mockStore.login.mockResolvedValueOnce({ data: { nickname: 'logintestuser', group_count: 0 } });
      
      fireEvent.change(screen.getByPlaceholderText('Email / Username'), { target: { value: 'login@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'password123' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => 
        expect(mockStore.login).toHaveBeenCalledWith('login@example.com', 'password123')
      );
      await waitFor(() => 
        expect(require('../util/Function').toast).toHaveBeenCalledWith(expect.stringContaining('欢迎logintestuser'))
      );
      await waitFor(() => 
        expect(mockHistoryPush).toHaveBeenCalledWith('/group')
      );
    });
    
    test('successful login redirects to /admin if group_count is -1 (admin)', async () => {
      render(<Front store={mockStore} />);
      mockStore.login.mockResolvedValueOnce({ data: { nickname: 'adminuser', group_count: -1 } });
      
      fireEvent.change(screen.getByPlaceholderText('Email / Username'), { target: { value: 'admin@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'adminpass' } });
      
      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(mockStore.login).toHaveBeenCalledWith('admin@example.com', 'adminpass'));
      await waitFor(() => expect(mockHistoryPush).toHaveBeenCalledWith('/admin'));
    });


    test('failed login (API error)', async () => {
      render(<Front store={mockStore} />);
      mockStore.login.mockResolvedValueOnce({ code: 1, info: 'Login failed' });

      fireEvent.change(screen.getByPlaceholderText('Email / Username'), { target: { value: 'badlogin@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrongpassword' } });

      fireEvent.click(screen.getByText('LOGIN'));

      await waitFor(() => expect(mockStore.login).toHaveBeenCalled());
      await waitFor(() => expect(require('../util/Function').showApiError).toHaveBeenCalledWith({ code: 1, info: 'Login failed' }));
    });
  });
});

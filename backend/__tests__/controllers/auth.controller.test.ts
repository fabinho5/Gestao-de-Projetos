// Mock Logger early
jest.mock('../../src/utils/logger.js', () => ({
  Logger: { info: jest.fn(), error: jest.fn() }
}));

// Mock AuthService with jest.fn() factories. We'll grab the mocks via jest.requireMock
jest.mock('../../src/services/auth.service.js', () => ({
  AuthService: {
    login: jest.fn(),
    refresh: jest.fn(),
    changePassword: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    adminResetPassword: jest.fn(),
    register: jest.fn(),
  }
}));

// Mock validators module
jest.mock('../../src/utils/validators.js', () => ({
  validators: {
    username: jest.fn(),
    passwordLogin: jest.fn(),
    password: jest.fn(),
    refreshToken: jest.fn(),
    userId: jest.fn(),
    email: jest.fn(),
    fullName: jest.fn(),
  },
  validateFields: jest.fn(),
}));

// Import the controller after mocks are declared so the module loads with mocked deps
const { AuthController } = require('../../src/controllers/auth.controller.js');

// placeholders for mock function references (assigned in beforeEach)
let mockLogin: jest.Mock;
let mockRefresh: jest.Mock;
let mockChangePassword: jest.Mock;
let mockLogout: jest.Mock;
let mockGetProfile: jest.Mock;
let mockAdminReset: jest.Mock;
let mockRegister: jest.Mock;
let mockValidateFields: jest.Mock;

describe('AuthController', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Re-acquire the mock functions so tests can set return values
    const authModule = jest.requireMock('../../src/services/auth.service.js');
    const validatorsModule = jest.requireMock('../../src/utils/validators.js');

    // Assign to locals used in tests
    // @ts-ignore
    mockLogin = authModule.AuthService.login;
    // @ts-ignore
    mockRefresh = authModule.AuthService.refresh;
    // @ts-ignore
    mockChangePassword = authModule.AuthService.changePassword;
    // @ts-ignore
    mockLogout = authModule.AuthService.logout;
    // @ts-ignore
    mockGetProfile = authModule.AuthService.getProfile;
    // @ts-ignore
    mockAdminReset = authModule.AuthService.adminResetPassword;
    // @ts-ignore
    mockRegister = authModule.AuthService.register;

    // @ts-ignore
    mockValidateFields = validatorsModule.validateFields;
  });

  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  describe('login', () => {
    it('returns 200 and result on success', async () => {
      mockValidateFields.mockReturnValue(null);
      const result = { accessToken: 'a', refreshToken: 'r', user: { id: 1 } };
      mockLogin.mockResolvedValue(result);

      const req: any = { body: { username: 'u', password: 'p' }, headers: {} };
      const res = makeRes();

      await AuthController.login(req, res);

      expect(mockLogin).toHaveBeenCalledWith('u', 'p');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(result);
    });

    it('returns 400 on validation error', async () => {
      mockValidateFields.mockReturnValue('bad');
      const req: any = { body: { username: 'u', password: 'p' }, headers: {} };
      const res = makeRes();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'bad' });
    });

    it('returns 401 on wrong credentials', async () => {
      mockValidateFields.mockReturnValue(null);
      mockLogin.mockRejectedValue(new Error('User not found'));

      const req: any = { body: { username: 'u', password: 'p' }, headers: {} };
      const res = makeRes();

      await AuthController.login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid username or password' });
    });
  });

  describe('refresh', () => {
    it('returns 200 on success', async () => {
      mockValidateFields.mockReturnValue(null);
      mockRefresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

      const req: any = { body: { refreshToken: 't' }, headers: {} };
      const res = makeRes();

      await AuthController.refresh(req, res);

      expect(mockRefresh).toHaveBeenCalledWith('t');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('returns 401 for invalid refresh', async () => {
      mockValidateFields.mockReturnValue(null);
      mockRefresh.mockRejectedValue(new Error('Invalid or expired refresh token'));

      const req: any = { body: { refreshToken: 't' }, headers: {} };
      const res = makeRes();

      await AuthController.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired refresh token' });
    });

    it('returns 403 when user inactive', async () => {
      mockValidateFields.mockReturnValue(null);
      mockRefresh.mockRejectedValue(new Error('User inactive'));

      const req: any = { body: { refreshToken: 't' }, headers: {} };
      const res = makeRes();

      await AuthController.refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'User is inactive' });
    });
  });

  describe('changePassword', () => {
    it('returns 200 on success', async () => {
      mockValidateFields.mockReturnValue(null);
      mockChangePassword.mockResolvedValue(undefined);
      const req: any = { user: { id: 1, username: 'u' }, body: { oldPassword: 'o', newPassword: 'n' }, headers: {} };
      const res = makeRes();

      await AuthController.changePassword(req, res);

      expect(mockChangePassword).toHaveBeenCalledWith(1, 'o', 'n');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Password changed' });
    });

    it('returns 401 when wrong old password', async () => {
      mockValidateFields.mockReturnValue(null);
      mockChangePassword.mockRejectedValue(new Error('Wrong password'));
      const req: any = { user: { id: 1 }, body: { oldPassword: 'o', newPassword: 'n' }, headers: {} };
      const res = makeRes();

      await AuthController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Wrong password' });
    });
  });

  describe('getProfile', () => {
    it('returns 401 when not authenticated', async () => {
      const req: any = { headers: {} };
      const res = makeRes();

      await AuthController.getProfile(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns profile on success', async () => {
      const profile = { id: 1, username: 'u' };
      mockGetProfile.mockResolvedValue(profile);
      const req: any = { user: { id: 1 }, headers: {} };
      const res = makeRes();

      await AuthController.getProfile(req, res);

      expect(mockGetProfile).toHaveBeenCalledWith(1);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(profile);
    });
  });

  describe('register', () => {
    it('returns 400 when role missing', async () => {
      mockValidateFields.mockReturnValue(null);
      const req: any = { body: { username: 'u', email: 'e', fullName: 'f', password: 'p', role: null }, headers: {} };
      const res = makeRes();

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Role is required' });
    });

    it('returns 400 when role invalid', async () => {
      mockValidateFields.mockReturnValue(null);
      const req: any = { body: { username: 'u', email: 'e', fullName: 'f', password: 'p', role: 'INVALID' }, headers: {} };
      const res = makeRes();

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
    });

    it('returns 201 on success', async () => {
      mockValidateFields.mockReturnValue(null);
      const newUser = { id: 1, username: 'u', email: 'e', fullName: 'f', role: 'CLIENT' };
      mockRegister.mockResolvedValue(newUser);
      const req: any = { body: { username: 'u', email: 'e', fullName: 'f', password: 'p', role: 'CLIENT' }, headers: {}, user: { id: 99 } };
      const res = makeRes();

      await AuthController.register(req, res);

      expect(mockRegister).toHaveBeenCalledWith('u', 'e', 'f', 'p', 'CLIENT');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(newUser);
    });
  });
});

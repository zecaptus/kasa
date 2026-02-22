import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQueryWithReauth';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  locale: 'FR' | 'EN';
  createdAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  name?: string;
  locale?: 'FR' | 'EN';
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    register: builder.mutation<UserDto, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
    }),
    login: builder.mutation<UserDto, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    refresh: builder.mutation<UserDto, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),
    getMe: builder.query<UserDto, void>({
      query: () => '/auth/me',
    }),
    updateProfile: builder.mutation<UserDto, UpdateProfileRequest>({
      query: (body) => ({
        url: '/account/profile',
        method: 'PATCH',
        body,
      }),
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useRefreshMutation,
  useGetMeQuery,
  useUpdateProfileMutation,
} = authApi;

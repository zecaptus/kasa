import { useEffect } from 'react';
import { Outlet } from 'react-router';
import { useGetMeQuery } from './services/authApi';
import { initialized, userLoaded } from './store/authSlice';
import { useAppDispatch } from './store/hooks';

export function App() {
  const dispatch = useAppDispatch();
  const { data, isError, isSuccess, isLoading } = useGetMeQuery();

  useEffect(() => {
    if (isSuccess && data) {
      dispatch(
        userLoaded({
          id: data.id,
          email: data.email,
          name: data.name,
          locale: data.locale,
        }),
      );
    } else if (isError) {
      dispatch(initialized());
    }
  }, [isSuccess, isError, data, dispatch]);

  if (isLoading) {
    return null;
  }

  return <Outlet />;
}

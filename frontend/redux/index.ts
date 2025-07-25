import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import userReducer from './user-store/userSlice'

// 1. Combine reducers if you have more than one
const rootReducer = combineReducers({
    user: userReducer,    // add other reducers here
});

// 2. Set up persist config
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['user'], // only persist the user and createPublication slices
};

// 3. Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// 4. Configure store
export const store = configureStore({
    reducer: persistedReducer,
    // add middleware if needed
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false, // redux-persist uses non-serializable values
        }),
});

// 5. Create persistor
export const persistor = persistStore(store);

// 6. Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 
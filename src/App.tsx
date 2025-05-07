import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation, createBrowserRouter, RouterProvider } from 'react-router-dom';
import './App.css';

// 카카오 로그인 페이지 컴포넌트
function LoginPage() {
  const handleKakaoLogin = () => {
    // 저장된 토큰이 있다면 로그아웃 처리
    const savedTokenData = localStorage.getItem('kakaoTokenData');
    if (savedTokenData) {
      localStorage.removeItem('kakaoTokenData');
    }
    
    // 카카오 로그인 URL로 리다이렉트 (scope 수정)
    window.location.href = 'https://kauth.kakao.com/oauth/authorize?client_id=0ca2ec520be5acd27b588df7f93ddb07&redirect_uri=https://wedding-guests.github.io/guests-pop/%23/auth&response_type=code&scope=talk_message,account_email';
  };

  return (
    <div className="App">
      <div className="login-container">
        <img 
          src="./images/kakao/ko/kakao_login_medium_narrow.png" 
          alt="카카오 로그인" 
          className="kakao-login-button"
          onClick={handleKakaoLogin}
        />
      </div>
    </div>
  );
}

// 인증 콜백 처리 페이지 컴포넌트
function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [tokenData, setTokenData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [friendsData, setFriendsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExistingMember, setIsExistingMember] = useState<boolean | null>(null);
  const searchParams = new URLSearchParams(location.search);
  const code = searchParams.get('code');

  useEffect(() => {
    const getToken = async () => {
      // 저장된 토큰이 있는지 확인
      const savedTokenData = localStorage.getItem('kakaoTokenData');
      if (savedTokenData) {
        const parsedTokenData = JSON.parse(savedTokenData);
        const expiresAt = new Date(parsedTokenData.expires_at).getTime();
        const now = new Date().getTime();
        
        // 토큰이 만료되지 않았다면 저장된 토큰 사용
        if (expiresAt > now) {
          setTokenData(parsedTokenData);
          getUserInfo(parsedTokenData.access_token);
          return;
        }
      }

      if (!code) {
        navigate('/');
        return;
      }

      try {
        const response = await fetch('https://kauth.kakao.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: '0ca2ec520be5acd27b588df7f93ddb07',
            redirect_uri: 'https://wedding-guests.github.io/guests-pop/%23/auth',
            code: code,
          }),
        });

        const data = await response.json();
        if (data.error) {
          setError(data.error_description || '토큰 요청 실패');
        } else {
          // 토큰 만료 시간 계산 (현재 시간 + expires_in)
          const expiresAt = new Date(Date.now() + data.expires_in * 1000);
          const tokenDataWithExpiry = {
            ...data,
            expires_at: expiresAt.toISOString(),
          };
          
          // 토큰 데이터를 localStorage에 저장
          localStorage.setItem('kakaoTokenData', JSON.stringify(tokenDataWithExpiry));
          setTokenData(tokenDataWithExpiry);
          getUserInfo(data.access_token);
        }
      } catch (err) {
        setError('토큰 요청 중 오류가 발생했습니다.');
      }
    };

    const getUserInfo = async (accessToken: string) => {
      try {
        const response = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        });

        const data = await response.json();
        if (data.error) {
          setError(data.error_description || '사용자 정보 요청 실패');
        } else {
          setUserData(data);
          // 이메일 정보를 가져온 후 회원 여부 확인
          checkExistingMember(data.kakao_account?.email, accessToken);
        }
      } catch (err) {
        setError('사용자 정보 요청 중 오류가 발생했습니다.');
      }
    };

    const checkExistingMember = async (email: string, accessToken: string) => {
      try {
        // 여기서는 예시로 이메일이 존재하는지만 확인
        // 실제로는 서버에서 회원 여부를 확인하는 API를 호출해야 합니다
        const isExisting = email ? true : false;
        setIsExistingMember(isExisting);
        
        // 회원 확인 후 친구 목록 가져오기
        getFriends(accessToken);
      } catch (err) {
        setError('회원 확인 중 오류가 발생했습니다.');
      }
    };

    const getFriends = async (accessToken: string) => {
      try {
        const response = await fetch('https://kapi.kakao.com/v1/api/talk/friends', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        const data = await response.json();
        if (data.error) {
          if (data.error === 'insufficient_scope') {
            // 추가 동의가 필요한 경우
            requestAdditionalConsent(accessToken);
          } else {
            setError(data.error_description || '친구 목록 요청 실패');
          }
        } else {
          setFriendsData(data);
        }
      } catch (err) {
        setError('친구 목록 요청 중 오류가 발생했습니다.');
      }
    };

    const requestAdditionalConsent = (accessToken: string) => {
      // 추가 동의 페이지로 리다이렉트
      window.location.href = `https://kauth.kakao.com/oauth/authorize?client_id=0ca2ec520be5acd27b588df7f93ddb07&redirect_uri=https://wedding-guests.github.io/guests-pop/%23/auth&response_type=code&scope=talk_message&prompt=consent`;
    };

    getToken();
  }, [code, navigate]);

  return (
    <div className="App">
      <div className="auth-container">
        <h2>인증 정보</h2>
        
        {/* 인가 코드 정보 */}
        <div className="info-block">
          <h3>1. 인가 코드 정보</h3>
          <pre>
            {JSON.stringify({
              code: code,
              fullUrl: window.location.href,
              search: location.search,
            }, null, 2)}
          </pre>
        </div>

        {/* 토큰 요청 정보 */}
        <div className="info-block">
          <h3>2. 토큰 요청 정보</h3>
          <pre>
            {JSON.stringify({
              grant_type: 'authorization_code',
              client_id: '0ca2ec520be5acd27b588df7f93ddb07',
              redirect_uri: 'https://wedding-guests.github.io/guests-pop/%23/auth',
              code: code,
            }, null, 2)}
          </pre>
        </div>

        {/* 토큰 응답 정보 */}
        <div className="info-block">
          <h3>3. 토큰 응답 정보</h3>
          {error ? (
            <div className="error-message">{error}</div>
          ) : tokenData ? (
            <pre>
              {JSON.stringify({
                access_token: tokenData.access_token,
                token_type: tokenData.token_type,
                refresh_token: tokenData.refresh_token,
                expires_in: tokenData.expires_in,
                scope: tokenData.scope,
                refresh_token_expires_in: tokenData.refresh_token_expires_in,
                expires_at: tokenData.expires_at,
              }, null, 2)}
            </pre>
          ) : (
            <div>토큰을 요청하는 중....</div>
          )}
        </div>

        {/* 사용자 정보 */}
        <div className="info-block">
          <h3>4. 사용자 정보</h3>
          {error ? (
            <div className="error-message">{error}</div>
          ) : userData ? (
            <pre>
              {JSON.stringify({
                id: userData.id,
                email: userData.kakao_account?.email,
                profile: userData.kakao_account?.profile,
              }, null, 2)}
            </pre>
          ) : (
            <div>사용자 정보를 요청하는 중...</div>
          )}
        </div>

        {/* 회원 여부 확인 결과 */}
        <div className="info-block">
          <h3>5. 회원 여부 확인</h3>
          {error ? (
            <div className="error-message">{error}</div>
          ) : isExistingMember !== null ? (
            <pre>
              {JSON.stringify({
                isExistingMember: isExistingMember,
                message: isExistingMember ? '기존 회원입니다.' : '신규 회원입니다.',
              }, null, 2)}
            </pre>
          ) : (
            <div>회원 여부를 확인하는 중...</div>
          )}
        </div>

        {/* 친구 목록 정보 */}
        <div className="info-block">
          <h3>6. 친구 목록 정보</h3>
          {error ? (
            <div className="error-message">{error}</div>
          ) : friendsData ? (
            <pre>
              {JSON.stringify({
                total_count: friendsData.total_count,
                favorite_count: friendsData.favorite_count,
                elements: friendsData.elements,
              }, null, 2)}
            </pre>
          ) : (
            <div>친구 목록을 요청하는 중...</div>
          )}
        </div>
      </div>
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <LoginPage /> },
  { path: "/auth", element: <AuthCallback /> },
], {
    basename: process.env.PUBLIC_URL
});

function App() {
  return (
    <RouterProvider router={router} />
  );
}

export default App;

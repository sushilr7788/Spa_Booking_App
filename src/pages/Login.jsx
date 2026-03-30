import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/endpoints';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';


export function Login() {
  const [email, setEmail] = useState('react@hipster-inc.com');
  const [password, setPassword] = useState('React@123');
  const [keyPass, setKeyPass] = useState('07ba959153fe7eec778361bf42079439');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuth();

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authApi.login(email, password, keyPass);
      if (response?.data?.data?.token?.token) {
        setAuth(response.data.data.token.token, response.data.data.user);
        navigate('/');
      } else {
        setError('Invalid login response structure');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container fluid className="vh-100 bg-light d-flex flex-column justify-content-center">
      <Row className="justify-content-center">
        <Col xs={12} sm={10} md={8} lg={5} xl={4}>
          <h2 className="text-center mb-4 fw-bold text-dark">
            Sign in to your account
          </h2>
          <Card className="shadow-sm border-0 rounded-3">
            <Card.Body className="p-4 p-md-5">
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3" controlId="formEmail">
                  <Form.Label className="fw-medium text-secondary">Email address</Form.Label>
                  <Form.Control type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </Form.Group>

                <Form.Group className="mb-3" controlId="formPassword">
                  <Form.Label className="fw-medium text-secondary">Password</Form.Label>
                  <Form.Control type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </Form.Group>

                <Form.Group className="mb-4" controlId="formKeyPass">
                  <Form.Label className="fw-medium text-secondary">Key Pass</Form.Label>
                  <Form.Control type="password" value={keyPass} onChange={e => setKeyPass(e.target.value)} required />
                </Form.Group>

                {error && <Alert variant="danger" className="py-2 text-sm text-center">{error}</Alert>}

                <Button variant="primary" type="submit" className="w-100 py-2 fs-5" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

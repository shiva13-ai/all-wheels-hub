import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { AlertCircle, Car, Wrench, User } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { authService } from '../services/supabase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { MechanicRegistrationForm } from '../components/MechanicRegistrationForm';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [userType, setUserType] = useState<'user' | 'mechanic'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMechanicForm, setShowMechanicForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await authService.signUp(email, password, fullName, phone);
      if (error) {
        setError(error.message);
      } else {
        if (userType === 'mechanic' && data.user) {
          // Show mechanic registration form
          setNewUserId(data.user.id);
          setShowMechanicForm(true);
          toast({
            title: 'Account created!',
            description: 'Please complete your mechanic profile.',
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'Please check your email to verify your account.',
          });
          // For regular users, you might want to wait for verification or navigate them somewhere else
           navigate('/');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMechanicRegistrationComplete = () => {
    setShowMechanicForm(false);
    navigate('/');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await authService.signIn(email, password);
      if (error) {
        setError(error.message);
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showMechanicForm && newUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <Wrench className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Complete Your Mechanic Profile</h1>
            <p className="text-muted-foreground">Help us verify your identity and expertise</p>
          </div>

          <Card className="border-border">
            <CardHeader>
              <CardTitle>Mechanic Registration</CardTitle>
              <CardDescription>
                Please provide your business details and verification documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MechanicRegistrationForm 
                userId={newUserId} 
                onComplete={handleMechanicRegistrationComplete}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">AutoAid</h1>
          <p className="text-muted-foreground">Your trusted vehicle service companion</p>
        </div>

        <Card className="border-border">
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-3">
                    <Label>I am a...</Label>
                    <RadioGroup value={userType} onValueChange={(value: any) => setUserType(value)}>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="user" id="user" />
                        <Label htmlFor="user" className="flex items-center gap-2 cursor-pointer flex-1">
                          <User className="w-5 h-5" />
                          <div>
                            <p className="font-medium">Vehicle Owner</p>
                            <p className="text-xs text-muted-foreground">Looking for service</p>
                          </div>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="mechanic" id="mechanic" />
                        <Label htmlFor="mechanic" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Wrench className="w-5 h-5" />
                          <div>
                            <p className="font-medium">Mechanic/Shop Owner</p>
                            <p className="text-xs text-muted-foreground">Providing services</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Creating account...' : 'Continue'}
                  </Button>
                  {userType === 'mechanic' && (
                    <p className="text-xs text-muted-foreground text-center">
                      You'll need to provide your Udyam registration and verification photo next
                    </p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;

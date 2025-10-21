import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { AlertCircle, Car, Wrench, User, PersonStanding, Shield, User as UserIcon } from 'lucide-react'; 
import { Alert, AlertDescription } from '../components/ui/alert';
import { authService } from '../services/supabase/auth';
import { profilesService } from '../services/supabase/profiles'; 
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { MechanicRegistrationForm } from '../components/MechanicRegistrationForm';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>('prefer_not_to_say'); 
  const [guardianPhone, setGuardianPhone] = useState(''); 
  const [userType, setUserType] = useState<'user' | 'mechanic'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showMechanicForm, setShowMechanicForm] = useState(false);
  const [newUserId, setNewUserId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isFemaleUser = userType === 'user' && gender === 'female';

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validation for guardian phone
    if (isFemaleUser && !guardianPhone.trim()) {
        setError("Guardian phone number is required for female users.");
        setLoading(false);
        return;
    }

    try {
      // 1. Sign up the user (creates auth.users entry)
      const { data, error: authError } = await authService.signUp(email, password, fullName);
      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }
      
      const newAuthUser = data.user;

      if (newAuthUser) {
        // 2. Update the newly created profile with additional sign-up details
        const profileUpdates = {
          full_name: fullName,
          phone,
          gender: gender, 
          guardian_phone: isFemaleUser ? guardianPhone : null, 
          role: userType,
        };
        
        const { error: profileError } = await profilesService.updateProfile(newAuthUser.id, profileUpdates);
        
        if (profileError) {
             console.error("Failed to update profile details:", profileError);
             setError("Account created, but failed to save profile details. Please update your profile later.");
        }

        if (userType === 'mechanic') {
          setNewUserId(newAuthUser.id);
          setShowMechanicForm(true);
          toast({
            title: 'Account created!',
            description: 'Please complete your mechanic profile for verification.',
          });
        } else {
          toast({
            title: 'Account created!',
            description: 'Welcome to AutoAid! You are now signed in.',
          });
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
                  
                  {/* User Type Selection */}
                  <div className="space-y-3">
                    <Label>Account Type</Label>
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
                  
                  {/* Gender Selection */}
                  <div className="space-y-3">
                    <Label>Gender</Label>
                    <RadioGroup 
                        value={gender} 
                        onValueChange={(value: any) => setGender(value)}
                        className="flex justify-between"
                        required
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 mr-1 hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="male" id="male" />
                        <Label htmlFor="male" className="flex items-center gap-2 cursor-pointer flex-1">
                            <Shield className="w-4 h-4 text-blue-500" /> 
                            Male
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 mr-1 hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="female" id="female" />
                        <Label htmlFor="female" className="flex items-center gap-2 cursor-pointer flex-1">
                            <UserIcon className="w-4 h-4 text-pink-500" />
                            Female
                        </Label>
                      </div>
                       <div className="flex items-center space-x-2 p-3 rounded-lg border border-border flex-1 hover:bg-accent/50 transition-colors cursor-pointer">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="flex items-center gap-2 cursor-pointer flex-1">
                            <PersonStanding className="w-4 h-4 text-green-500" />
                            Other
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  {/* Guardian Phone for Female Users */}
                  {isFemaleUser && (
                    <div className="space-y-2 p-3 border border-pink-300 bg-pink-50/50 rounded-lg">
                        <Label htmlFor="guardian-phone" className="text-pink-600 font-semibold">Emergency Contact (Guardian Phone) *</Label>
                        <Input
                          id="guardian-phone"
                          type="tel"
                          value={guardianPhone}
                          onChange={(e) => setGuardianPhone(e.target.value)}
                          placeholder="Guardian's Phone Number"
                          required={isFemaleUser}
                        />
                         <p className="text-xs text-muted-foreground">
                            For your safety, this number will receive alerts during late-night service requests (8 PM - 6 AM).
                        </p>
                    </div>
                  )}
                  
                  {/* Existing Fields */}
                  <div className="space-y-2">
                    <Label htmlFor="signup-fullname">Full Name *</Label>
                    <Input
                      id="signup-fullname"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number *</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
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
                      You'll need to provide your business verification details next.
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

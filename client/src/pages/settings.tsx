import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Edit, Trash2, Settings as SettingsIcon, Users, Key, Wifi, WifiOff, Phone, Crown, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";

interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  extension: string;
  userType: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
}

interface CreateUserForm {
  fullName: string;
  email: string;
  phone: string;
  extension: string;
  userType: string;
  password: string;
  confirmPassword: string;
}

interface TwilioCredentials {
  id?: number;
  accountSid: string;
  apiKey: string;
  apiSecret: string;
  twimlAppSid: string;
  phoneNumber: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function Settings() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const { isConnected, lastMessage } = useWebSocket();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createUserForm, setCreateUserForm] = useState<CreateUserForm>({
    fullName: "",
    email: "",
    phone: "",
    extension: "",
    userType: "",
    password: "",
    confirmPassword: "",
  });
  const [twilioForm, setTwilioForm] = useState<TwilioCredentials>({
    accountSid: "",
    apiKey: "",
    apiSecret: "",
    twimlAppSid: "",
    phoneNumber: "",
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: currentUser?.userType === 'admin' || currentUser?.userType === 'manager',
  });

  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserForm) => {
      await apiRequest('POST', '/api/users', {
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        extension: userData.extension,
        userType: userData.userType,
        password: userData.password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsCreateDialogOpen(false);
      setCreateUserForm({
        fullName: "",
        email: "",
        phone: "",
        extension: "",
        userType: "",
        password: "",
        confirmPassword: "",
      });
      toast({
        title: "Success",
        description: "User created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: Partial<User> }) => {
      await apiRequest('PUT', `/api/users/${userId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setEditingUser(null);
      toast({
        title: "Success",
        description: "User updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Twilio credentials query and mutation
  const { data: twilioCredentials, refetch: refetchTwilio } = useQuery({
    queryKey: ['/api/twilio/credentials'],
    enabled: currentUser?.userType === 'admin',
  });

  const saveTwilioMutation = useMutation({
    mutationFn: async (credentialsData: TwilioCredentials) => {
      await apiRequest('POST', '/api/twilio/credentials', credentialsData);
    },
    onSuccess: () => {
      refetchTwilio();
      toast({
        title: "Success", 
        description: "Twilio credentials saved successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save Twilio credentials",
        variant: "destructive",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (createUserForm.password !== createUserForm.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (!createUserForm.userType) {
      toast({
        title: "Missing Field",
        description: "Please select a user type",
        variant: "destructive",
      });
      return;
    }

    createUserMutation.mutate(createUserForm);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUserMutation.mutate({
      userId: editingUser.id,
      data: {
        fullName: editingUser.fullName,
        email: editingUser.email,
        phone: editingUser.phone,
        extension: editingUser.extension,
        userType: editingUser.userType,
        isActive: editingUser.isActive,
      },
    });
  };

  const handleDeleteUser = (userId: number, userName: string) => {
    if (window.confirm(`Are you sure you want to delete ${userName}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleSaveTwilioCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveTwilioMutation.mutate(twilioForm);
  };

  // Load existing Twilio credentials when component mounts
  useEffect(() => {
    if (twilioCredentials?.credentials) {
      setTwilioForm({
        accountSid: twilioCredentials.credentials.accountSid || "",
        apiKey: twilioCredentials.credentials.apiKey || "",
        apiSecret: "", // Never pre-fill the secret for security
        twimlAppSid: twilioCredentials.credentials.twimlAppSid || "",
        phoneNumber: twilioCredentials.credentials.phoneNumber || "",
      });
    }
  }, [twilioCredentials]);

  // Handle real-time WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'user_created':
          // Refresh user list and show notification
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          toast({
            title: "User Created",
            description: lastMessage.message,
          });
          break;
        
        case 'user_updated':
          // Refresh user list and show notification
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          toast({
            title: "User Updated", 
            description: lastMessage.message,
          });
          break;
        
        case 'user_deleted':
          // Refresh user list and show notification
          queryClient.invalidateQueries({ queryKey: ['/api/users'] });
          toast({
            title: "User Deleted",
            description: lastMessage.message,
          });
          break;
        
        case 'auth_success':
          console.log('WebSocket authenticated successfully');
          break;
        
        case 'auth_error':
          console.error('WebSocket authentication failed:', lastMessage.message);
          break;
      }
    }
  }, [lastMessage, queryClient, toast]);

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-primary/10 text-primary';
      case 'manager':
        return 'bg-secondary/10 text-secondary';
      case 'user':
        return 'bg-slate/10 text-slate-600';
      default:
        return 'bg-slate/10 text-slate-600';
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
              <p className="text-slate-600">Manage your system settings and users</p>
            </div>
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <div className="flex items-center space-x-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Real-time</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1 text-gray-400">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Offline</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="twilio" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Twilio Setup
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4" />
              System Settings
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Stats Cards - Only for Admin Users */}
            {currentUser?.userType === 'admin' && users && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Total Users</p>
                        <p className="text-2xl font-bold text-slate-800">{users.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-success/10 rounded-xl flex items-center justify-center">
                        <Phone className="h-6 w-6 text-success" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Active Users</p>
                        <p className="text-2xl font-bold text-slate-800">{users.filter(user => user.isActive).length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <Crown className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Administrators</p>
                        <p className="text-2xl font-bold text-slate-800">{users.filter(user => user.userType === 'admin').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Shield className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-slate-600">Managers</p>
                        <p className="text-2xl font-bold text-slate-800">{users.filter(user => user.userType === 'manager').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {(currentUser?.userType === 'admin' || currentUser?.userType === 'manager') && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Manage system users and their permissions
                    </p>
                  </div>
                  {currentUser?.userType === 'admin' && (
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="create-fullName">Full Name</Label>
                              <Input
                                id="create-fullName"
                                value={createUserForm.fullName}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, fullName: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="create-email">Email</Label>
                              <Input
                                id="create-email"
                                type="email"
                                value={createUserForm.email}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, email: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="create-phone">Phone</Label>
                              <Input
                                id="create-phone"
                                value={createUserForm.phone}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, phone: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="create-extension">Extension</Label>
                              <Input
                                id="create-extension"
                                value={createUserForm.extension}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, extension: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="create-userType">User Type</Label>
                            <Select onValueChange={(value) => setCreateUserForm(prev => ({ ...prev, userType: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select user type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrator</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="create-password">Password</Label>
                              <Input
                                id="create-password"
                                type="password"
                                value={createUserForm.password}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, password: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="create-confirmPassword">Confirm Password</Label>
                              <Input
                                id="create-confirmPassword"
                                type="password"
                                value={createUserForm.confirmPassword}
                                onChange={(e) => setCreateUserForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                required
                              />
                            </div>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={createUserMutation.isPending}>
                              {createUserMutation.isPending ? "Creating..." : "Create User"}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-200 rounded animate-pulse"></div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              User
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Extension
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {users?.map((user) => (
                            <tr key={user.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center">
                                    <span className="text-slate-500 text-sm font-medium">
                                      {user.fullName.charAt(0)}
                                    </span>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-slate-800">{user.fullName}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-800">{user.email}</div>
                                <div className="text-sm text-slate-500">{user.phone}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-800">
                                {user.extension}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={getUserTypeColor(user.userType)}>
                                  {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <Badge className={user.isActive ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {currentUser?.userType === 'admin' && (
                                  <div className="flex space-x-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-primary hover:text-blue-700"
                                          onClick={() => setEditingUser(user)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                          <DialogTitle>Edit User</DialogTitle>
                                        </DialogHeader>
                                        {editingUser && (
                                          <form onSubmit={handleUpdateUser} className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label htmlFor="edit-fullName">Full Name</Label>
                                                <Input
                                                  id="edit-fullName"
                                                  value={editingUser.fullName}
                                                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, fullName: e.target.value } : null)}
                                                  required
                                                />
                                              </div>
                                              <div>
                                                <Label htmlFor="edit-email">Email</Label>
                                                <Input
                                                  id="edit-email"
                                                  type="email"
                                                  value={editingUser.email}
                                                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
                                                  required
                                                />
                                              </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                              <div>
                                                <Label htmlFor="edit-phone">Phone</Label>
                                                <Input
                                                  id="edit-phone"
                                                  value={editingUser.phone}
                                                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, phone: e.target.value } : null)}
                                                  required
                                                />
                                              </div>
                                              <div>
                                                <Label htmlFor="edit-extension">Extension</Label>
                                                <Input
                                                  id="edit-extension"
                                                  value={editingUser.extension}
                                                  onChange={(e) => setEditingUser(prev => prev ? { ...prev, extension: e.target.value } : null)}
                                                  required
                                                />
                                              </div>
                                            </div>
                                            <div>
                                              <Label htmlFor="edit-userType">User Type</Label>
                                              <Select
                                                value={editingUser.userType}
                                                onValueChange={(value: 'admin' | 'manager' | 'user') => 
                                                  setEditingUser(prev => prev ? { ...prev, userType: value } : null)
                                                }
                                              >
                                                <SelectTrigger>
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="admin">Administrator</SelectItem>
                                                  <SelectItem value="manager">Manager</SelectItem>
                                                  <SelectItem value="user">User</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                            <div className="flex justify-end space-x-2">
                                              <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                                                Cancel
                                              </Button>
                                              <Button type="submit" disabled={updateUserMutation.isPending}>
                                                {updateUserMutation.isPending ? "Updating..." : "Update User"}
                                              </Button>
                                            </div>
                                          </form>
                                        )}
                                      </DialogContent>
                                    </Dialog>
                                    {user.id !== currentUser?.id && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-800"
                                        onClick={() => handleDeleteUser(user.id, user.fullName)}
                                        disabled={deleteUserMutation.isPending}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="twilio" className="space-y-6">
            {currentUser?.userType === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Twilio Credentials</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Configure your Twilio account credentials for VoIP functionality
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSaveTwilioCredentials} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="accountSid">Account SID</Label>
                        <Input
                          id="accountSid"
                          value={twilioForm.accountSid}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, accountSid: e.target.value }))}
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Twilio Account SID (starts with AC)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="apiKey">API Key SID</Label>
                        <Input
                          id="apiKey"
                          value={twilioForm.apiKey}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Twilio API Key SID (starts with SK)
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="apiSecret">API Secret</Label>
                        <Input
                          id="apiSecret"
                          type="password"
                          value={twilioForm.apiSecret}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, apiSecret: e.target.value }))}
                          placeholder="Your API Secret"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your Twilio API Secret (keep this secure)
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="twimlAppSid">TwiML App SID</Label>
                        <Input
                          id="twimlAppSid"
                          value={twilioForm.twimlAppSid}
                          onChange={(e) => setTwilioForm(prev => ({ ...prev, twimlAppSid: e.target.value }))}
                          placeholder="APxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your TwiML Application SID (starts with AP)
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="phoneNumber">Twilio Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={twilioForm.phoneNumber}
                        onChange={(e) => setTwilioForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="+1234567890"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your Twilio phone number in E.164 format (e.g. +1234567890)
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-sm text-muted-foreground">
                        {twilioCredentials?.credentials ? (
                          <span className="text-green-600">✓ Credentials configured</span>
                        ) : (
                          <span className="text-amber-600">⚠ No credentials configured</span>
                        )}
                      </div>
                      <Button type="submit" disabled={saveTwilioMutation.isPending}>
                        {saveTwilioMutation.isPending ? "Saving..." : "Save Credentials"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
            
            {currentUser?.userType !== 'admin' && (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">Only administrators can configure Twilio credentials.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure system-wide settings and preferences
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" placeholder="Your Company Name" />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="est">Eastern Time (EST)</SelectItem>
                        <SelectItem value="pst">Pacific Time (PST)</SelectItem>
                        <SelectItem value="utc">UTC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="call-recording">Call Recording</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recording option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="enabled">Enabled</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button>Save System Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage security and authentication settings
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                    <Input id="session-timeout" type="number" placeholder="60" />
                  </div>
                  <div>
                    <Label htmlFor="password-policy">Password Policy</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select password policy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic (8+ characters)</SelectItem>
                        <SelectItem value="strong">Strong (12+ chars, mixed case, numbers)</SelectItem>
                        <SelectItem value="complex">Complex (16+ chars, symbols required)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="two-factor">Two-Factor Authentication</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select 2FA option" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disabled">Disabled</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                        <SelectItem value="required">Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button>Save Security Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Users, Phone, Crown, User, Shield } from "lucide-react";

interface DashboardUser {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  extension: string;
  userType: 'admin' | 'manager' | 'user';
  isActive: boolean;
  createdAt: string;
}

export default function Dashboard() {
  const { data: users = [], isLoading } = useQuery<DashboardUser[]>({
    queryKey: ['/api/users'],
  });

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'manager':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'user':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'admin':
        return Crown;
      case 'manager':
        return Shield;
      case 'user':
        return User;
      default:
        return User;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.isActive).length;
  const adminCount = users.filter(user => user.userType === 'admin').length;
  const managerCount = users.filter(user => user.userType === 'manager').length;

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
          <p className="text-slate-600">Welcome back! Here's your team overview.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Users</p>
                  <p className="text-2xl font-bold text-slate-800">{totalUsers}</p>
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
                  <p className="text-2xl font-bold text-slate-800">{activeUsers}</p>
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
                  <p className="text-2xl font-bold text-slate-800">{adminCount}</p>
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
                  <p className="text-2xl font-bold text-slate-800">{managerCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              System Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No users found</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {users.map((user) => {
                  const IconComponent = getUserTypeIcon(user.userType);
                  return (
                    <Card key={user.id} className="border-2 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center">
                            <span className="text-slate-600 text-sm font-medium">
                              {getInitials(user.fullName)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-slate-800 truncate">
                              {user.fullName}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge className={getUserTypeColor(user.userType)}>
                                <IconComponent className="h-3 w-3 mr-1" />
                                {user.userType.charAt(0).toUpperCase() + user.userType.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <div className="flex items-center text-sm text-slate-500">
                                <Phone className="h-3 w-3 mr-1" />
                                Ext: {user.extension}
                              </div>
                              <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {user.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

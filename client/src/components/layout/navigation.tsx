import { useAuth } from "../../hooks/use-auth";
  import { Button } from "../ui/button";
  import { Link, useLocation } from "wouter";
  import { 
    Globe, LogOut, LayoutDashboard, FileText, 
    Briefcase, Users, Settings, Crown 
  } from "lucide-react";
  import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "../ui/dropdown-menu";
  import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
  import { Badge } from "../ui/badge";

  export default function Navigation() {
    const { user, logout } = useAuth();
    const [location] = useLocation();
    
    const getInitials = (firstName?: string, lastName?: string) => {
      return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'U';
    };
    
    const getTierColor = (tier?: string) => {
      switch (tier) {
        case 'enterprise': return 'bg-purple-100 text-purple-800';
        case 'professional': return 'bg-blue-100 text-blue-800';
        default: return 'bg-gray-100 text-gray-800';
      }
    };
    
    const clientLinks = [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/orders', label: 'My Orders', icon: FileText },
      { path: '/orders/new', label: 'New Order', icon: Briefcase },
    ];
    
    const linguistLinks = [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/jobs', label: 'Available Jobs', icon: Briefcase },
    ];
    
    const adminLinks = [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ];
    
    const links = user?.role === 'linguist' ? linguistLinks :
                  user?.role === 'admin' ? adminLinks : clientLinks;
    
    return (
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/">
                <a className="flex items-center gap-2 font-bold text-xl text-gray-900 hover:text-blue-600 transition-colors">
                  <Globe className="h-6 w-6 text-blue-600" />
                  TranslateHub
                </a>
              </Link>
              
              <div className="hidden md:flex items-center gap-1">
                {links.map(link => {
                  const Icon = link.icon;
                  const isActive = location === link.path;
                  return (
                    <Link key={link.path} href={link.path}>
                      <a className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 font-medium' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}>
                        <Icon className="h-4 w-4" />
                        {link.label}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user?.subscriptionTier && (
                <Badge className={getTierColor(user.subscriptionTier)}>
                  <Crown className="h-3 w-3 mr-1" />
                  {user.subscriptionTier}
                </Badge>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user?.profileImageUrl} />
                      <AvatarFallback>{getInitials(user?.firstName, user?.lastName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium">{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-gray-500">{user?.email}</span>
                      <Badge variant="outline" className="mt-1 w-fit text-xs">
                        {user?.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>
    );
  }
  
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";
import { MapPin, Users, UserPlus, UserMinus, Droplets, Hospital, Star } from "lucide-react";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";

interface ProfileCardProps {
  user: User;
  isOwnProfile?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
}

export function ProfileCard({ user, isOwnProfile = false, isFollowing, onFollowToggle }: ProfileCardProps) {
  const followersCount = user.followers?.length ?? 0;
  const hasDonorInfo = user.donorBloodGroup || user.donorLocation || user.donorNearestHospitals;

  return (
    <Card className="w-full">
      <CardHeader className="items-center text-center p-6">
        <Avatar className="h-24 w-24 mb-4 border-4 border-primary/50 shadow-lg">
            <AvatarImage src={user.photoURL ?? undefined} alt={user.name ?? "user"} />
            <AvatarFallback className="text-3xl bg-secondary text-secondary-foreground">{user.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <CardTitle className="text-2xl text-primary font-headline">{user.name}</CardTitle>
        <CardDescription>@{user.username}</CardDescription>
        <CardDescription className="text-muted-foreground">{user.email}</CardDescription>
        {user.country && (
            <CardDescription className="text-muted-foreground flex items-center pt-1">
                <MapPin className="mr-1 h-4 w-4" />
                {user.country}
            </CardDescription>
        )}
      </CardHeader>
      
      {hasDonorInfo && (
        <>
            <Separator />
            <CardContent className="p-6 text-sm">
                <h3 className="font-bold mb-4 text-center text-destructive">Donor Profile</h3>
                <div className="space-y-3">
                    {user.donorBloodGroup && (
                        <div className="flex items-center gap-3">
                            <Droplets className="h-5 w-5 text-destructive" />
                            <span className="font-semibold">Blood Group: {user.donorBloodGroup}</span>
                        </div>
                    )}
                    {user.donorLocation && (
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                            <span>{user.donorLocation}</span>
                        </div>
                    )}
                    {user.donorNearestHospitals && (
                        <div className="flex items-start gap-3">
                            <Hospital className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                                <p className="font-semibold">Nearest Hospitals:</p>
                                <p className="text-muted-foreground whitespace-pre-line">{user.donorNearestHospitals}</p>
                            </div>
                        </div>
                    )}
                     <div className="flex items-center gap-3">
                        <Star className="h-5 w-5 text-yellow-400" />
                        <span className="text-muted-foreground">
                            Rating: {user.donorRating?.toFixed(1) || 'N/A'} ({user.donorRatingCount || 0} reviews)
                        </span>
                    </div>
                </div>
            </CardContent>
        </>
      )}

      <CardFooter className="flex-col p-4 border-t">
        {isOwnProfile ? (
          <div className="text-center">
            <p className="font-bold text-lg text-foreground">{followersCount}</p>
            <p className="text-sm text-muted-foreground">Followers</p>
          </div>
        ) : onFollowToggle ? (
            <Button className="w-full" onClick={onFollowToggle} variant={isFollowing ? "outline" : "default"}>
                {isFollowing ? (
                    <>
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unfollow
                    </>
                ) : (
                    <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Follow
                    </>
                )}
            </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}

import Nat8 "mo:base/Nat8";
import Principal "mo:base/Principal";
import NFTActorClass "../NFT/nft";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import Bool "mo:base/Bool";


actor OpenD {
 
    private type Listing = {
        itemOwner: Principal;
        itemPrice: Nat;
    };

    var mapOfNFTs = HashMap.HashMap<Principal, NFTActorClass.NFT>(1, Principal.equal, Principal.hash);
    var mapOfOwners = HashMap.HashMap<Principal, List.List<Principal>>(1, Principal.equal, Principal.hash);
    var mapOfListings = HashMap.HashMap<Principal, Listing>(1, Principal.equal, Principal.hash);

    public shared(msg) func mint(imgData: [Nat8], name: Text) : async Principal{

        let owner : Principal = msg.caller;
        
        Debug.print(debug_show(Cycles.balance()));
        Cycles.add(105_500_000_000);
        
        let newNFT = await NFTActorClass.NFT(name, owner, imgData);
        Debug.print(debug_show(Cycles.balance()));
        Debug.print("Hey");
        let newNFTPrincipal = await newNFT.getCanisterID();

        mapOfNFTs.put(newNFTPrincipal, newNFT);
        addToOwnershipMap(owner, newNFTPrincipal);
        
        return newNFTPrincipal;

    };

    private func addToOwnershipMap(owner: Principal, nftId: Principal){
        var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(owner)){

            case null List.nil<Principal>();
            case (?result) result;

        };

        ownedNFTs := List.push(nftId, ownedNFTs);
        mapOfOwners.put(owner, ownedNFTs);
    };

    public query func getOwnedNFTs(user: Principal) : async [Principal]{

        var userNFTs : List.List<Principal> = switch (mapOfOwners.get(user)){
            case null List.nil<Principal>();
            case (?result) result;
        };

        return List.toArray(userNFTs);
    };

    public query func getListedNFTs() : async [Principal]{

      let ids =  Iter.toArray( mapOfListings.keys());
        return ids;

    };

    public shared(msg) func listItem(id: Principal, price: Nat) : async Text{

        var item : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT does not exist.";
            case (?result) result;
        };

    //To transfer the NFT item only if it's called by the owner of that NFT
        let owner = await item.getOwner();
        if(Principal.equal(owner, msg.caller)){
           
            let newListing : Listing = {
                itemOwner = owner;
                itemPrice = price;
            };

            mapOfListings.put(id, newListing);

            return "Success";

        }else{
            return "You don't own the NFT.";
        }

    };

    //To get the canister ID
    public query func getOpenDCanisterID() : async Principal{
        return Principal.fromActor(OpenD);
    };

    //To check if the item is listed or not
    public query func isListed(id: Principal) : async Bool{
        if ( mapOfListings.get(id) == null ){
            return false;
        }else{
            return true;
        }
    };

    //To get the original owner of a NFT item
    public query func getOriginalOwner(id: Principal) : async Principal {
        var listing : Listing = switch (mapOfListings.get(id)) {
            case null return Principal.fromText("");
            case (?result) result;
        };

        return listing.itemOwner;
    };

    //To get a price of a NFT item
    public query func getListedNFTPrice(id : Principal) : async Nat {
        var listing : Listing = switch (mapOfListings.get(id)){
            case null return 0;
            case (?result) result;
        };

        return listing.itemPrice;
    };

    //After buying a NFT item and transfer the ownership
    public shared(msg) func completePurchase(id: Principal, ownerId: Principal, newOwnerId: Principal) : async Text {

        var purchasedNFT : NFTActorClass.NFT = switch (mapOfNFTs.get(id)) {
            case null return "NFT does not exist";
            case (?result) result
        };

        let transferResult = await purchasedNFT.transferOwnership(newOwnerId);
        if(transferResult == "Success"){
            mapOfListings.delete(id);
            var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(ownerId)){
                case null List.nil<Principal>();
                case (?result) result;
            };

            ownedNFTs := List.filter(ownedNFTs, func (listItemId: Principal) : Bool {
                return listItemId != id;
            });

            addToOwnershipMap(newOwnerId, id);
            return "Success";
        }else{
            Debug.print("Hello trensferResult");
            return transferResult;
        }


        
    };

};
